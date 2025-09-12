import Link from 'next/link'
import { db } from '@/lib/db'
import { createLesson, deleteLesson } from '@/actions/admin'

export default async function AdminLessonsPage() {
  const [trainings, lessons] = await Promise.all([
    db.training.findMany({ include: { modules: true }, orderBy: { title: 'asc' } }),
    db.lesson.findMany({ include: { module: { include: { training: true } } }, orderBy: { title: 'asc' } }),
  ])
  const modules = trainings.flatMap(t => t.modules.map(m => ({ id: m.id, label: `${t.title} • ${m.title}` })))
  return (
    <div className="grid gap-6">

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Create lesson</h2>
        <form action={async (fd: FormData) => { 'use server'; await createLesson(fd) }} className="grid gap-3 md:grid-cols-5 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input name="slug" required className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Module</label>
            <select name="moduleId" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm">
              {modules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="block text-sm mb-1">External URL (optional)</label>
            <input name="externalUrl" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" placeholder="https://." />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Add lesson</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-neutral-50/60">
            <tr>
              <th className="text-left py-2 px-3">Title</th>
              <th className="text-left py-2 px-3">Module</th>
              <th className="text-left py-2 px-3">Slug</th>
              <th className="text-left py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((l) => (
              <tr key={l.id} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-2 px-3"><Link className="underline" href={`/admin/lessons/${l.id}`}>{l.title}</Link></td>
                <td className="py-2 px-3">{l.module.training.title} • {l.module.title}</td>
                <td className="py-2 px-3">{l.slug}</td>
                <td className="py-2 px-3">
                  <form action={async () => { 'use server'; await deleteLesson(l.id) }}>
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
