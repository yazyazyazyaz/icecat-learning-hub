import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { gtins, ...rest } = await req.json()
    if (!Array.isArray(gtins) || gtins.length === 0) {
      return NextResponse.json({ error: 'gtins must be a non-empty array' }, { status: 400 })
    }
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/?$/, '')
    const endpoint = base ? `${base}/api/live` : '/api/live'
    const results = await Promise.allSettled(gtins.map((GTIN: string) =>
      fetch(endpoint, { method: 'POST', body: JSON.stringify({ ...rest, GTIN }) })
        .then(r => r.text().then(t => ({ ok: r.ok, status: r.status, body: t })))
    ))
    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid request' }, { status: 400 })
  }
}

