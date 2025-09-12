import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED = [
  '/dashboard',
  '/trainings',
  '/lessons',
  '/quizzes',
  '/admin',
  '/editor',
  '/user',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!needsAuth) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = new URL('/signin', req.url)
    url.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin')) {
    const role = (token as any).role
    // Admin area is restricted to ADMIN only
    if (!role || role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
  if (pathname.startsWith('/editor')) {
    const role = (token as any).role
    // Editor area is visible to ADMIN and TRAINER
    if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api/auth|static|favicon.ico).*)'],
}
