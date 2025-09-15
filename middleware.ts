import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Enforce sign-in for the entire site, except auth pages and static assets.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Public routes that should remain accessible without auth
  const isPublic = (
    pathname === '/signin' ||
    pathname === '/register'
  )
  if (isPublic) return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = new URL('/signin', req.url)
    // Preserve callback including query string
    url.searchParams.set('callbackUrl', pathname + (search || ''))
    return NextResponse.redirect(url)
  }

  // Role gating for special areas
  if (pathname.startsWith('/admin')) {
    const role = (token as any).role
    if (!role || role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
  if (pathname.startsWith('/editor')) {
    const role = (token as any).role
    if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }
  return NextResponse.next()
}

// Apply to all routes, excluding static assets, api, and auth pages
export const config = {
  matcher: [
    '/((?!api|signin|register|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon|apple-touch-icon).*)',
  ],
}
