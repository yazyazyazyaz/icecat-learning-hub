import { db } from '@/lib/db'
import QuizRunner from '@/components/QuizRunner'

interface Props { params: { id: string } }

export default async function QuizPage({ params }: Props) {
  const quiz = await db.quiz.findUnique({ where: { id: params.id }, include: { questions: { orderBy: { order: 'asc' } } } })
  if (!quiz) return <p>Quiz not found.</p>
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border p-4">
        <h1 className="text-xl font-semibold">{quiz.title}</h1>
        {quiz.description && <p className="text-gray-600 dark:text-gray-300">{quiz.description}</p>}
      </div>
      <QuizRunner quiz={quiz} />
    </div>
  )
}

