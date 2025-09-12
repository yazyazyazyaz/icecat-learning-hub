import { db } from '@/lib/db'
import MarkDoneButton from '@/components/MarkDoneButton'

export default async function OnboardingChecklist({ userId }: { userId: string }) {
  // Simple onboarding = all lessons from the 'onboarding' training
  const training = await db.training.findUnique({
    where: { slug: 'onboarding' },
    include: { modules: { include: { lessons: true }, orderBy: { order: 'asc' } } },
  })
  if (!training) return null
  const lessonIds = training.modules.flatMap((m) => m.lessons.map((l) => l.id))
  const progress = await db.progress.findMany({ where: { userId, lessonId: { in: lessonIds } } })
  const done = new Set(progress.filter((p) => p.isCompleted).map((p) => p.lessonId))
  const total = lessonIds.length
  const doneCount = done.size
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold mb-2">Onboarding Checklist</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{doneCount} of {total} lessons completed.</p>
      <ul className="grid gap-2">
        {training.modules.flatMap((m) => m.lessons).map((l) => (
          <li key={l.id} className="flex items-center justify-between rounded border p-2">
            <a href={`/lessons/${l.slug}`} className="font-medium">{l.title}</a>
            <MarkDoneButton lessonId={l.id} initialCompleted={done.has(l.id)} />
          </li>
        ))}
      </ul>
    </section>
  )
}

