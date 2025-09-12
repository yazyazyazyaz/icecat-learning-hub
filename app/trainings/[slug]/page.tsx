import { db } from '@/lib/db'

interface Props { params: { slug: string } }

export default async function TrainingDetailPage({ params }: Props) {
  const training = await db.training.findUnique({
    where: { slug: params.slug },
    include: { modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } }, quizzes: true },
  })
  if (!training) return <p>Training not found.</p>
  return (
    <div className="grid gap-6">
      <header className="rounded-lg border p-4">
        <h1 className="text-xl font-semibold">{training.title}</h1>
        <p className="text-gray-600 dark:text-gray-300">{training.summary}</p>
      </header>
      <section className="grid gap-4">
        {training.modules.map((m) => (
          <div key={m.id} className="rounded-lg border p-4">
            <h2 className="font-medium mb-2">{m.title}</h2>
            <ul className="list-disc pl-5">
              {m.lessons.map((l) => (
                <li key={l.id}><a href={`/lessons/${l.slug}`}>{l.title}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      {training.quizzes.length > 0 && (
        <section className="rounded-lg border p-4">
          <h2 className="font-medium mb-2">Quizzes</h2>
          <ul className="list-disc pl-5">
            {training.quizzes.map((q) => (
              <li key={q.id}><a href={`/quizzes/${q.id}`}>{q.title}</a></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

