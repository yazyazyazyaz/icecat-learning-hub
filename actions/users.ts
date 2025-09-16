"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  jobFunction: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  invite: z.string().optional(),
})

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input)
  const exists = await db.user.findUnique({ where: { email: data.email }, select: { id: true } })
  if (exists) {
    return { ok: false, error: "Email already registered" }
  }
  const hash = await bcrypt.hash(data.password, 10)
  let role: any = undefined
  if (data.invite) {
    const inv = await db.invite.findUnique({ where: { token: data.invite } })
    const now = new Date()
    if (inv && !inv.usedAt && (!inv.expiresAt || inv.expiresAt > now)) {
      role = inv.role
      // mark used
      await db.invite.update({ where: { token: data.invite }, data: { usedAt: now } })
    }
  }
  try {
    const u = await db.user.create({
      data: {
        name: data.name,
        jobFunction: data.jobFunction,
        email: data.email,
        password: hash,
        approved: false,
        ...(role ? { role } : {}),
      } as any,
      select: { id: true, name: true, email: true },
    })
    // Notify admin of new registration
    try {
      const { sendMail } = await import('@/lib/mail')
      await sendMail({
        to: process.env.NEW_USER_NOTIFY_EMAIL || 'yagiz@icecat.com',
        subject: `New registration: ${data.name} <${data.email}>`,
        text: `A new user registered.\n\nName: ${data.name}\nEmail: ${data.email}\nFunction: ${data.jobFunction}\nInvite: ${data.invite || '-'}\n\nApprove in Admin → Users.`,
      })
    } catch (e) {
      console.warn('Failed to send registration email notification', e)
    }
  } catch (e) {
    // Fallback when optional columns (e.g., jobFunction) are not present in DB
    const user = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash,
        approved: false,
        ...(role ? { role } : {}),
      } as any,
      select: { id: true },
    })
    try {
      await (db as any).$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "UserKV" (
        userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT,
        PRIMARY KEY (userId, key)
      )`)
      await (db as any).$executeRawUnsafe('INSERT INTO "UserKV" ("userId","key","value") VALUES ($1,$2,$3) ON CONFLICT ("userId","key") DO UPDATE SET value=EXCLUDED.value', user.id, 'jobFunction', data.jobFunction)
    } catch {}
    // Attempt notification even on fallback
    try {
      const { sendMail } = await import('@/lib/mail')
      await sendMail({
        to: process.env.NEW_USER_NOTIFY_EMAIL || 'yagiz@icecat.com',
        subject: `New registration: ${data.name} <${data.email}>`,
        text: `A new user registered.\n\nName: ${data.name}\nEmail: ${data.email}\nFunction: ${data.jobFunction}\nInvite: ${data.invite || '-'}\n\nApprove in Admin → Users.`,
      })
    } catch {}
  }
  return { ok: true }
}

const approveSchema = z.object({ id: z.string().cuid() })

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'ADMIN') {
    console.warn('requireAdmin: forbidden - missing ADMIN role')
    throw new Error('Forbidden')
  }
}

export async function approveUser(id: string) {
  await requireAdmin()
  const parsed = approveSchema.safeParse({ id })
  const userId = parsed.success ? parsed.data.id : id
  try {
    await db.user.update({ where: { id: userId }, data: { approved: true }, select: { id: true } })
  } catch (e) {
    // Fallback: try raw SQL for environments where Prisma schema may be out of sync
    try {
      await (db as any).$executeRawUnsafe(`UPDATE "User" SET "approved"=true WHERE "id"=$1`, userId)
    } catch (err) {
      throw e
    }
  }
  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return { ok: true }
}

export async function approveUsers(ids: string[]) {
  await requireAdmin()
  const unique = Array.from(new Set(ids))
  if (unique.length === 0) return { ok: true }
  await db.user.updateMany({ where: { id: { in: unique } }, data: { approved: true } })
  revalidatePath('/admin/users')
  return { ok: true, count: unique.length }
}

const updateRoleSchema = z.object({ id: z.string().cuid(), role: z.enum(['ADMIN','TRAINER','EMPLOYEE']) })

export async function updateUserRole(formData: FormData | { id: string; role: string }) {
  await requireAdmin()
  const input = formData instanceof FormData
    ? { id: String(formData.get('userId') || ''), role: String(formData.get('role') || '') }
    : formData
  const parsed = updateRoleSchema.parse({ id: input.id, role: input.role as any })
  await db.user.update({ where: { id: parsed.id }, data: { role: parsed.role as any }, select: { id: true } })
  revalidatePath('/admin/users')
  return { ok: true }
}

export async function deactivateUser(id: string) {
  await requireAdmin()
  const { id: userId } = approveSchema.parse({ id })
  await db.user.update({ where: { id: userId }, data: { approved: false }, select: { id: true } })
  revalidatePath('/admin/users')
  return { ok: true }
}

const updateEmailSchema = z.object({ id: z.string().cuid(), email: z.string().email() })

export async function updateUserEmail(formData: FormData | { id: string; email: string }) {
  await requireAdmin()
  const input = formData instanceof FormData
    ? { id: String(formData.get('userId') || ''), email: String(formData.get('email') || '') }
    : formData
  const parsed = updateEmailSchema.parse(input)
  await db.user.update({ where: { id: parsed.id }, data: { email: parsed.email } as any, select: { id: true } })
  revalidatePath('/admin/users')
  return { ok: true }
}
