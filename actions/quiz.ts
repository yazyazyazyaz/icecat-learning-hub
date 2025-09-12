"use server"
import { z } from 'zod'
import { db } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { scoreQuiz } from '@/lib/quiz'

const startSchema = z.object({ quizId: z.string() })
const submitSchema = z.object({ quizId: z.string(), answers: z.record(z.any()) })

export async function startQuiz(input: unknown) {
  const { quizId } = startSchema.parse(input)
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) throw new Error('Unauthorized')
  const attempt = await db.attempt.create({ data: { quizId, userId } })
  return { ok: true, attemptId: attempt.id }
}

export async function submitQuiz(input: unknown) {
  // Accept FormData or object
  let data: any
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    data = Object.fromEntries(input.entries())
    if (typeof data.answers === 'string') {
      try { data.answers = JSON.parse(data.answers) } catch { data.answers = {} }
    }
  } else {
    data = input
  }
  const { quizId, answers } = submitSchema.parse(data)
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) throw new Error('Unauthorized')

  const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { questions: true } })
  if (!quiz) throw new Error('Quiz not found')
  const result = scoreQuiz(quiz.questions, answers)
  const passed = result.score >= (quiz.passThreshold ?? 70)
  const attempt = await db.attempt.create({
    data: {
      quizId,
      userId,
      answers,
      score: result.score,
      passed,
      submittedAt: new Date(),
    },
  })
  return { ok: true, result, attemptId: attempt.id }
}
