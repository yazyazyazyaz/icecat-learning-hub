"use client"
import { useMemo, useState } from 'react'
import type { Quiz, Question } from '@prisma/client'
import { submitQuiz } from '@/actions/quiz'

export default function QuizRunner({ quiz }: { quiz: Quiz & { questions: Question[] } }) {
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(null)
  const q = quiz.questions[index]

  const isLast = index === quiz.questions.length - 1

  const onSubmit = async (formData: FormData) => {
    const answers: Record<string, any> = {}
    for (const question of quiz.questions) {
      const key = `q_${question.id}`
      const val = formData.getAll(key)
      answers[question.id] = question.type === 'MULTI' ? val.map(String) : String(val[0] ?? '')
    }
    const fd = new FormData()
    fd.set('quizId', quiz.id)
    fd.set('answers', JSON.stringify(answers))
    const res = await submitQuiz(fd)
    setResult(res.result)
  }

  if (result) {
    const pass = result.score >= (quiz.passThreshold ?? 70)
    return (
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Results</h2>
        <p>Score: <strong>{result.score}%</strong> — {pass ? 'Passed' : 'Failed'}</p>
      </div>
    )
  }

  return (
    <form className="rounded-lg border p-4 grid gap-4" action={onSubmit}>
      <div>
        <div className="text-sm text-gray-500">Question {index + 1} of {quiz.questions.length}</div>
        <h2 className="font-medium">{q.prompt}</h2>
        <div className="mt-2 grid gap-2">
          {q.type === 'TRUEFALSE' || q.type === 'SINGLE' ? (
            ((q.options as any[] | null) ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input type="radio" name={`q_${q.id}`} value={opt} />
                <span>{opt}</span>
              </label>
            ))
          ) : q.type === 'MULTI' ? (
            ((q.options as any[] | null) ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input type="checkbox" name={`q_${q.id}`} value={opt} />
                <span>{opt}</span>
              </label>
            ))
          ) : (
            <input className="rounded-md border px-3 py-2" name={`q_${q.id}`} placeholder="Your answer" />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} className="rounded px-3 py-2 border" disabled={index === 0}>
          Previous
        </button>
        {isLast ? (
          <button className="rounded bg-brand-600 px-3 py-2 text-white hover:bg-brand-700" type="submit">Submit</button>
        ) : (
          <button type="button" onClick={() => setIndex((i) => Math.min(quiz.questions.length - 1, i + 1))} className="rounded px-3 py-2 border">
            Next
          </button>
        )}
      </div>
    </form>
  )
}
