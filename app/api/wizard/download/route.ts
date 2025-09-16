import { NextRequest, NextResponse } from 'next/server'
import { consumeTempDownload } from '@/lib/tempDownloads'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }
  const entry = consumeTempDownload(token)
  if (!entry) {
    return NextResponse.json({ error: 'Download expired' }, { status: 404 })
  }
  const headers = new Headers()
  headers.set('Content-Type', entry.mime)
  headers.set('Content-Disposition', `attachment; filename="${entry.filename}"`)
  return new NextResponse(entry.buffer, { status: 200, headers })
}
