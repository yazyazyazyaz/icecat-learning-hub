"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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

export async function updateProfile(formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  const userId = (session.user as any).id as string
  if (!userId) throw new Error("Unauthorized")

  // Deprecated fields intentionally ignored: BO/FO usernames, Content token
  const appKeyRaw        = String(formData.get('appKey') || '').trim()
  const appKey           = appKeyRaw ? appKeyRaw : undefined
  const contentTokenRaw  = String(formData.get('contentToken') || '').trim()
  const contentToken     = contentTokenRaw ? contentTokenRaw : undefined
  const accessTokenRaw   = String(formData.get('accessToken') || '').trim()
  const accessToken      = accessTokenRaw ? accessTokenRaw : undefined
  const jobFunction      = String(formData.get('jobFunction') || '').trim() || null

  // Update fields individually to be resilient if some columns
  // are not yet present in the Prisma client/database.
  const fields: Record<string, any> = { jobFunction }
  if (typeof appKey !== 'undefined') fields.appKey = appKey
  if (typeof contentToken !== 'undefined') fields.contentToken = contentToken
  if (typeof accessToken !== 'undefined') fields.accessToken = accessToken

  for (const [key, value] of Object.entries(fields)) {
    // Avoid Prisma update to prevent Unknown argument errors on lagging client
    try {
      await db.$executeRawUnsafe(`UPDATE "User" SET "${key}" = $1 WHERE "id" = $2`, value, userId)
      continue
    } catch {}
    try {
      await ensureUserKV()
      await (db as any).$executeRawUnsafe('INSERT INTO "UserKV" ("userId","key","value") VALUES ($1,$2,$3) ON CONFLICT ("userId","key") DO UPDATE SET value=EXCLUDED.value', userId, key, String(value ?? ''))
      continue
    } catch {}
  }

  revalidatePath('/profile')
}

export async function hasAppKey(): Promise<boolean> {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  const userId = (session.user as any).id as string
  try {
    const user: any = await (db as any).user.findUnique({ where: { id: userId } })
    if (user?.appKey) return true
  } catch {
    // ignore
  }
  try {
    await ensureUserKV()
    const rows: any[] = await (db as any).$queryRawUnsafe('SELECT value FROM "UserKV" WHERE "userId"=$1 AND key=$2', userId, 'appKey')
    return Boolean(rows?.[0]?.value)
  } catch { return false }
}

export async function peekAppKey(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  const userId = (session.user as any).id as string
  try {
    const user: any = await (db as any).user.findUnique({ where: { id: userId } })
    if (user?.appKey) return user.appKey
  } catch {
    // ignore
  }
  try {
    await ensureUserKV()
    const rows: any[] = await (db as any).$queryRawUnsafe('SELECT value FROM "UserKV" WHERE "userId"=$1 AND key=$2', userId, 'appKey')
    return rows?.[0]?.value ?? null
  } catch { return null }
}
