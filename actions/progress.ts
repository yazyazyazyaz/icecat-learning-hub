"use server"
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

const schema = z.object({
  lessonId: z.string(),
  isCompleted: z.coerce.boolean(),
})

export async function markLessonDone(input: unknown) {
  // Accept FormData or plain object
  let data: Record<string, unknown>
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    data = Object.fromEntries(input.entries())
  } else {
    data = (input as any) ?? {}
  }
  const { lessonId, isCompleted } = schema.parse(data)
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) throw new Error('Unauthorized')

  const existing = await db.progress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: { isCompleted, completedAt: isCompleted ? new Date() : null },
    create: { userId, lessonId, isCompleted, completedAt: isCompleted ? new Date() : null },
  })
  return { ok: true, progress: existing }
}

export async function getUserProgress(userId?: string) {
  const session = await getServerSession(authOptions)
  const id = userId ?? ((session?.user as any)?.id as string | undefined)
  if (!id) throw new Error('Unauthorized')
  const items = await db.progress.findMany({ where: { userId: id } })
  return items
}

