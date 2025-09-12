import Link from 'next/link'
import { db } from '@/lib/db'
import { createQuiz, deleteQuiz } from '@/actions/admin'

export default async function AdminQuizzesPage() {
  const quizzes = await db.quiz.findMany({ include: { questions: true }, orderBy: { title: 'asc' } })
  return (
    <div className="grid gap-6">

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Create quiz</h2>
        <form action={async (fd: FormData) => { 'use server'; await createQuiz(fd) }} className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" placeholder="Quiz for Week 1" />
          </div>
          <div>
            <label className="block text-sm mb-1">Pass %</label>
            <input name="passThreshold" type="number" min={0} max={100} defaultValue={70} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Time limit (sec)</label>
            <input name="timeLimitSeconds" type="number" min={0} defaultValue={0} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Add quiz</button>
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" placeholder="Short description" />
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-neutral-50/60">
            <tr>
              <th className="text-left py-2 px-3">Title</th>
              <th className="text-left py-2 px-3">Questions</th>
              <th className="text-left py-2 px-3">Pass %</th>
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => (
              <tr key={q.id} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-2 px-3"><Link className="underline" href={`/admin/quizzes/${q.id}`}>{q.title}</Link></td>
                <td className="py-2 px-3">{q.questions.length}</td>
                <td className="py-2 px-3">{q.passThreshold}</td>
                <td className="py-2 px-3">{q.timeLimitSeconds}s</td>
                <td className="py-2 px-3">
                  <form action={async () => { 'use server'; await deleteQuiz(q.id) }}>
                    <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-2 py-1 hover:bg-neutral-100/60">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

