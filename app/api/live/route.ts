import { NextResponse } from 'next/server'
import { LiveRequestSchema } from '@/lib/icecat'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { lang, shopname, GTIN, ProductCode, Brand, icecat_id, content, relationsLimit } = LiveRequestSchema.parse(body)

    const url = new URL('https://live.icecat.biz/api')
    url.searchParams.set('lang', lang)
    url.searchParams.set('shopname', shopname)
    if (GTIN) url.searchParams.set('GTIN', GTIN)
    if (icecat_id) url.searchParams.set('icecat_id', icecat_id)
    if (ProductCode && Brand) { url.searchParams.set('ProductCode', ProductCode); url.searchParams.set('Brand', Brand) }
    if (content) url.searchParams.set('content', content)
    if (relationsLimit) url.searchParams.set('relationsLimit', String(relationsLimit))

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'api-token': process.env.ICECAT_API_TOKEN || '',
        'content-token': process.env.ICECAT_CONTENT_TOKEN || '',
      },
      cache: 'no-store',
    })
    const text = await res.text()
    // Try JSON first, otherwise return text
    try {
      const json = JSON.parse(text)
      return NextResponse.json(json, { status: res.status })
    } catch {
      return new NextResponse(text, { status: res.status, headers: { 'content-type': 'text/plain; charset=utf-8' } })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Invalid request' }, { status: 400 })
  }
}

