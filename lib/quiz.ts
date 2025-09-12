import type { Question, QuestionType } from '@prisma/client'

export function scoreQuiz(questions: Question[], answers: Record<string, unknown>) {
  let correct = 0
  for (const q of questions) {
    const a = answers[q.id]
    if (q.type === ('TRUEFALSE' as QuestionType) || q.type === ('SINGLE' as QuestionType)) {
      if (String(a) === String((q.correct as any)?.[0])) correct++
    } else if (q.type === ('MULTI' as QuestionType)) {
      const got = new Set((a as string[]) || [])
      const need = new Set((q.correct as string[]) || [])
      if (need.size === got.size && [...need].every((v) => got.has(v))) correct++
    } else if (q.type === ('SHORT' as QuestionType)) {
      const expect = String((q.correct as any)?.[0] || '').trim().toLowerCase()
      const gotStr = String(a || '').trim().toLowerCase()
      if (gotStr === expect) correct++
    }
  }
  const score = Math.round((correct / Math.max(1, questions.length)) * 100)
  return { correct, total: questions.length, score }
}

