import { describe, it, expect } from 'vitest'
import { scoreQuiz } from '@/lib/quiz'

describe('scoreQuiz', () => {
  it('scores different question types', () => {
    const questions: any[] = [
      { id: '1', type: 'TRUEFALSE', correct: ['true'] },
      { id: '2', type: 'SINGLE', correct: ['a'] },
      { id: '3', type: 'MULTI', correct: ['a', 'b'] },
      { id: '4', type: 'SHORT', correct: ['hello'] },
    ]
    const answers = { '1': 'true', '2': 'a', '3': ['a', 'b'], '4': 'Hello' }
    const res = scoreQuiz(questions as any, answers)
    expect(res.correct).toBe(4)
    expect(res.score).toBe(100)
  })
})

