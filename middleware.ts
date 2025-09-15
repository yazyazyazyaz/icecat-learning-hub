import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Only protect Admin and Editor areas; everything else is public.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/editor')) {
    return NextResponse.next()
  }

  // Edge runtime: pass v4 secret explicitly
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const url = new URL('/signin', req.url)
    url.searchParams.set('callbackUrl', pathname + (search || ''))
    return NextResponse.redirect(url)
  }

  const role = (token as any).role
  if (pathname.startsWith('/admin')) {
    if (!role || role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
  }
  if (pathname.startsWith('/editor')) {
    if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) {
      return NextResponse.redirect(new URL('/signin', req.url))
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/editor/:path*'],
}
