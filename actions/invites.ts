"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { randomBytes } from "crypto"

import type { Session } from "next-auth"

async function requireAdminOrTrainer(): Promise<Session> {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) throw new Error('Forbidden')
  return session!
}

const inviteSchema = z.object({
  role: z.enum(["ADMIN","TRAINER","EMPLOYEE","VIEWER"]).default("EMPLOYEE"),
  email: z.string().email().optional().or(z.literal('')),
  days: z.coerce.number().int().min(1).max(90).default(14),
})

export async function createInvite(input: FormData | unknown) {
  const session = await requireAdminOrTrainer()
  const data = input instanceof FormData
    ? { role: String(input.get('role')||'EMPLOYEE'), email: String(input.get('email')||'') || undefined, days: Number(input.get('days')||14) }
    : input
  const parsed = inviteSchema.parse(data as any)
  const token = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + parsed.days * 24 * 60 * 60 * 1000)
  await db.invite.create({ data: { token, role: parsed.role as any, email: parsed.email, createdBy: (session!.user as any)?.id, expiresAt } })
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const link = `${base}/register?invite=${token}`
  return { ok: true, token, link }
}

export async function createInviteAction(prevState: any, formData: FormData) {
  return createInvite(formData)
}

export async function revokeInvite(token: string) {
  await requireAdminOrTrainer()
  await db.invite.delete({ where: { token } })
  return { ok: true }
}
