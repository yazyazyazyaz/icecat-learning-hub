export const runtime = 'nodejs'

import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const now = await prisma.$queryRawUnsafe<any[]>(`select now()`)
    const who = await prisma.$queryRawUnsafe<any[]>(`select current_user`)
    return new Response(
      JSON.stringify({ ok: true, now: now?.[0]?.now ?? null, user: who?.[0]?.current_user ?? null }),
      { headers: { 'content-type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || 'Failed') }), { status: 500 })
  }
}

