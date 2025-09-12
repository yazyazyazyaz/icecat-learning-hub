import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

async function ensureUserKV() {
  try {
    await (db as any).$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "UserKV" (
      userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (userId, key)
    )`)
  } catch {}
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch {}
  const jobFunction = (typeof body.jobFunction === 'string' && body.jobFunction.trim() !== '') ? body.jobFunction.trim() : null
  const appKey      = typeof body.appKey === 'string' ? body.appKey.trim() : undefined
  const contentToken= typeof body.contentToken === 'string' ? body.contentToken.trim() : undefined
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : undefined
  const fields: Record<string, any> = { jobFunction }
  if (typeof appKey !== 'undefined') fields.appKey = appKey
  if (typeof contentToken !== 'undefined') fields.contentToken = contentToken
  if (typeof accessToken !== 'undefined') fields.accessToken = accessToken
  const stored: Array<{ key: string; store: 'user'|'kv' }> = []
  for (const [key, value] of Object.entries(fields)) {
    let ok = false
    // Try updating column directly (if it exists)
    try {
      await db.$executeRawUnsafe(`UPDATE "User" SET "${key}" = $1 WHERE "id" = $2`, value, userId)
      stored.push({ key, store: 'user' })
      ok = true
    } catch {}
    if (!ok) {
      // Fallback to KV table
      try {
        await ensureUserKV()
        await (db as any).$executeRawUnsafe(
          'INSERT INTO "UserKV" ("userId","key","value") VALUES ($1,$2,$3) ON CONFLICT ("userId","key") DO UPDATE SET value=EXCLUDED.value',
          userId,
          key,
          String(value ?? '')
        )
        stored.push({ key, store: 'kv' })
        ok = true
      } catch {}
    }
  }
  if (stored.length === 0) {
    return NextResponse.json({ ok: false, error: 'Failed to persist changes' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, stored })
}
