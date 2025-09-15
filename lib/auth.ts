import type { NextAuthOptions, User as NextAuthUser } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  // Allow running on Vercel without NEXTAUTH_URL by trusting host header
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Email / Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (!email || !password) return null
        let user: { id: string; email: string; password: string | null; approved?: boolean | null; name?: string | null; image?: string | null; role?: any } | null = null
        try {
          user = await db.user.findUnique({
            where: { email },
            select: { id: true, email: true, password: true, approved: true, name: true, image: true, role: true },
          })
        } catch {
          // Fallback for DBs missing the `approved` column
          user = await db.user.findUnique({
            where: { email },
            select: { id: true, email: true, password: true, name: true, image: true, role: true },
          }) as any
        }
        if (!user || !user.password) return null
        const ok = await bcrypt.compare(password, user.password)
        if (!ok) return null
        // Do not block here on approved; handle in signIn callback to provide a clear message
        const out: NextAuthUser = {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email,
          image: user.image ?? undefined,
        }
        return out
      },
    }),
    // Placeholders for future OIDC providers (Azure AD / Google)
    // AzureAD(...), Google(...)
  ],
  callbacks: {
    async signIn({ user, account, credentials }) {
      // Enforce admin approval for credentials sign-in
      if (account?.provider === 'credentials') {
        try {
          const u = await db.user.findUnique({ where: { email: String(user?.email || '') }, select: { approved: true } })
          if (u && typeof u.approved === 'boolean' && !u.approved) {
            // Redirect to sign-in with explicit error
            return '/signin?error=AccountNotApproved'
          }
        } catch {}
      }
      return true
    },
    async jwt({ token, user }) {
      // On sign-in, seed token fields from DB
      if (user?.email) {
        try {
          const u = await db.user.findUnique({ where: { email: user.email }, select: { id: true, role: true } })
          token.id = u?.id
          token.role = u?.role
        } catch {}
        return token
      }
      // Ensure role/id are always present; refresh if missing
      if (!token.role || !token.id) {
        try {
          const byId = token.id ? await db.user.findUnique({ where: { id: String(token.id) }, select: { id: true, role: true } }) : null
          const u = byId ?? (token.email ? await db.user.findUnique({ where: { email: String(token.email) }, select: { id: true, role: true } }) : null)
          if (u) {
            token.id = u.id
            token.role = u.role
          }
        } catch {}
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        // Fallback: if role still missing, fetch from DB
        if (!(session.user as any).role && session.user.email) {
          try {
            const u = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } })
            if (u) {
              ;(session.user as any).id = u.id
              ;(session.user as any).role = u.role
            }
          } catch {}
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/signin',
  },
  // Accept either NEXTAUTH_SECRET or AUTH_SECRET
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
}
