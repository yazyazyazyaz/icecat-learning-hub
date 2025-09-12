"use server"
import { z } from 'zod'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

const trainingSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().default(''),
  isMandatory: z.coerce.boolean().default(false),
  durationMinutes: z.coerce.number().default(15),
  tags: z.array(z.string()).default([]),
})

async function requireTrainerOrAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) throw new Error('Forbidden')
}

export async function createTraining(input: unknown) {
  await requireTrainerOrAdmin()
  const data = trainingSchema.parse(input)
  const t = await db.training.create({ data })
  return { ok: true, training: t }
}

export async function updateTraining(id: string, input: unknown) {
  await requireTrainerOrAdmin()
  const data = trainingSchema.partial().parse(input)
  const t = await db.training.update({ where: { id }, data })
  return { ok: true, training: t }
}

export async function deleteTraining(id: string) {
  await requireTrainerOrAdmin()
  await db.training.delete({ where: { id } })
  return { ok: true }
}

// Stubs for lessons/quizzes could be expanded similarly

// Quizzes
const quizSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  timeLimitSeconds: z.coerce.number().int().min(0).default(0),
  passThreshold: z.coerce.number().int().min(0).max(100).default(70),
})

import { revalidatePath } from 'next/cache'

export async function createQuiz(formData: FormData) {
  await requireTrainerOrAdmin()
  const parsed = quizSchema.parse({
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || ''),
    timeLimitSeconds: Number(formData.get('timeLimitSeconds') || 0),
    passThreshold: Number(formData.get('passThreshold') || 70),
  })
  const quiz = await db.quiz.create({ data: parsed })
  revalidatePath('/admin/quizzes')
  return { ok: true, quiz }
}

export async function updateQuiz(id: string, input: unknown) {
  await requireTrainerOrAdmin()
  const data = quizSchema.partial().parse(input)
  const quiz = await db.quiz.update({ where: { id }, data })
  return { ok: true, quiz }
}

export async function deleteQuiz(id: string) {
  await requireTrainerOrAdmin()
  await db.question.deleteMany({ where: { quizId: id } })
  await db.quiz.delete({ where: { id } })
  return { ok: true }
}

const mcqSchema = z.object({
  quizId: z.string(),
  prompt: z.string().min(2),
  options: z.array(z.string()).min(2).max(6),
  correct: z.string(),
  explanation: z.string().optional().default(''),
})

export async function addMcqQuestion(input: unknown) {
  await requireTrainerOrAdmin()
  const data = mcqSchema.parse(input)
  const count = await db.question.count({ where: { quizId: data.quizId } })
  const q = await db.question.create({
    data: {
      quizId: data.quizId,
      type: 'SINGLE',
      prompt: data.prompt,
      options: data.options,
      correct: [data.correct],
      explanation: data.explanation || null,
      order: count + 1,
    },
  })
  return { ok: true, question: q }
}

export async function deleteQuestion(id: string) {
  await requireTrainerOrAdmin()
  await db.question.delete({ where: { id } })
  return { ok: true }
}

// Lessons
const lessonCreateSchema = z.object({
  moduleId: z.string(),
  title: z.string(),
  slug: z.string(),
  externalUrl: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  bodyMdx: z.string().optional(),
})

export async function createLesson(formData: FormData) {
  await requireTrainerOrAdmin()
  const data = lessonCreateSchema.parse({
    title: String(formData.get('title') || ''),
    slug: String(formData.get('slug') || ''),
    moduleId: String(formData.get('moduleId') || ''),
    externalUrl: String(formData.get('externalUrl') || ''),
  })
  // Determine next order within the module
  const count = await db.lesson.count({ where: { moduleId: data.moduleId } })
  const lesson = await db.lesson.create({ data: { ...data, order: count + 1 } })
  revalidatePath('/admin/lessons')
  return { ok: true, lesson }
}

export async function updateLesson(id: string, input: unknown) {
  await requireTrainerOrAdmin()
  const data = lessonCreateSchema.partial().parse(input)
  const lesson = await db.lesson.update({ where: { id }, data })
  return { ok: true, lesson }
}

export async function deleteLesson(id: string) {
  await requireTrainerOrAdmin()
  await db.lesson.delete({ where: { id } })
  return { ok: true }
}

export async function loadLessonBodyFromMdx(lessonId: string, mdxSlug: string) {
  await requireTrainerOrAdmin()
  const filePath = path.join(process.cwd(), 'content', `${mdxSlug}.mdx`)
  const content = await fs.readFile(filePath, 'utf8')
  const lesson = await db.lesson.update({ where: { id: lessonId }, data: { bodyMdx: content } })
  return { ok: true, lesson }
}

// Modules
const moduleSchema = z.object({
  trainingId: z.string(),
  title: z.string().min(2),
})

export async function createModule(formData: FormData | { trainingId: string; title: string }) {
  await requireTrainerOrAdmin()
  const data = formData instanceof FormData
    ? moduleSchema.parse({ trainingId: String(formData.get('trainingId')||''), title: String(formData.get('title')||'') })
    : moduleSchema.parse(formData)
  const count = await db.module.count({ where: { trainingId: data.trainingId } })
  const mod = await db.module.create({ data: { trainingId: data.trainingId, title: data.title, order: count + 1 } })
  revalidatePath('/editor/onboarding')
  return { ok: true, module: mod }
}
