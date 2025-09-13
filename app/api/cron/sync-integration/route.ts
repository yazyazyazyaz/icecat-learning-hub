import { NextResponse } from 'next/server'
import { syncRefsFromFrostKitty, syncRefsFromIcecat } from '@/actions/refs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get('key') || ''
  const secret = process.env.CRON_SECRET || ''
  if (!secret || key !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const frost = await syncRefsFromFrostKitty().catch(e => ({ error: e?.message || 'failed' }))
  const ice = await syncRefsFromIcecat().catch(e => ({ error: e?.message || 'failed' }))
  return NextResponse.json({ frost, ice })
}

