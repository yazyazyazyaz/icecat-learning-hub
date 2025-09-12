import { db } from "@/lib/db"
import { createTraining, createModule } from "@/actions/admin"

export default async function EditorOnboardingPage() {
  // Ensure an onboarding training exists
  let training = await db.training.findUnique({ where: { slug: 'onboarding' }, include: { modules: { include: { lessons: true }, orderBy: { order: 'asc' } } } })
  if (!training) {
    // Create a lightweight onboarding shell if not present
    await createTraining({ slug: 'onboarding', title: 'Onboarding Program', summary: 'Weekly onboarding program', isMandatory: true, durationMinutes: 60, tags: ['onboarding'] })
    training = await db.training.findUnique({ where: { slug: 'onboarding' }, include: { modules: { include: { lessons: true }, orderBy: { order: 'asc' } } } })
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="text-sm text-neutral-600 mt-1">Structure a week-by-week plan interns and new hires can follow. Add weeks and link lessons or external resources.</p>
        {training && (
          <form action={async (fd: FormData)=>{ 'use server'; fd.append('trainingId', training!.id); if(!fd.get('title')) fd.set('title', `Week ${(training!.modules?.length||0)+1}`); await createModule(fd) }} className="mt-4 grid gap-3 md:grid-cols-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Week title</label>
              <input name="title" placeholder={`Week ${(training.modules?.length||0)+1}`} className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <button className="rounded-full border px-4 py-2 text-sm">Add week</button>
            </div>
          </form>
        )}
      </section>

      <section className="grid gap-3">
        {(training?.modules||[]).length === 0 && (
          <div className="text-sm text-neutral-600">No weeks yet. Add Week 1 above to get started.</div>
        )}
        {(training?.modules||[]).map((m, idx) => (
          <div key={m.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium">{m.title || `Week ${idx+1}`}</h2>
              <span className="text-xs text-neutral-600">{(m.lessons||[]).length} lesson(s)</span>
            </div>
            <ul className="mt-3 grid gap-1 text-sm list-disc pl-5">
              {(m.lessons||[]).map((l:any)=> (
                <li key={l.id}><a className="underline" href={`/lessons/${l.slug}`}>{l.title}</a></li>
              ))}
              {(m.lessons||[]).length===0 && <li className="text-neutral-600">No lessons linked yet.</li>}
            </ul>
            <div className="mt-3 text-xs text-neutral-600">Tip: Create lessons in Admin/Quizzes & Lessons, then link them here (linking UI can be added next).</div>
          </div>
        ))}
      </section>
    </div>
  )
}

