import { db } from '@/lib/db'

export default async function TrainingsPage() {
  const trainings = await db.training.findMany({ orderBy: { title: 'asc' } })
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Trainings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trainings.map((t) => (
          <a key={t.id} href={`/trainings/${t.slug}`} className="card p-4 hover:bg-white/5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.title}</h2>
              {t.isMandatory && <span className="badge">Mandatory</span>}
            </div>
            <p className="text-sm text-muted mt-1">{t.summary}</p>
            <div className="mt-2 text-xs text-muted">Tags: {t.tags.join(', ')}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
