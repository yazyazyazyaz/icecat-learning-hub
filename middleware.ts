import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHNAMES = new Set(['/signin', '/register'])
const PUBLIC_PREFIXES = ['/api/auth', '/_next', '/favicon', '/icecat-favicon', '/manifest', '/site.webmanifest', '/robots.txt']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHNAMES.has(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const isApiRoute = pathname.startsWith('/api/')
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL('/signin', req.url)
    url.searchParams.set('callbackUrl', pathname + (search || ''))
    return NextResponse.redirect(url)
  }

  const role = (token as any).role
  if (pathname.startsWith('/admin')) {
    if (role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
  }
  if (pathname.startsWith('/editor')) {
    if (role !== 'ADMIN' && role !== 'TRAINER') {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icecat-favicon.ico|site.webmanifest|robots.txt).*)',
  ],
}
