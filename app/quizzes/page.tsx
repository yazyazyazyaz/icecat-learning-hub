import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function QuizzesPage() {
  let quizzes: any[] = []
  try {
    quizzes = await db.quiz.findMany({ orderBy: { title: 'asc' } })
  } catch (e) {
    console.error('QuizzesPage: DB unavailable', e)
    quizzes = []
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="truncate">{q.title}</CardTitle>
                <Badge>Quiz</Badge>
              </div>
              <CardDescription>Available quiz</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href={`/quizzes/${q.id}`}>Open</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
