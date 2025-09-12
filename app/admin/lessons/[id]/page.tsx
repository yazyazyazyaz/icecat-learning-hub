import { db } from '@/lib/db'
import { updateLesson, loadLessonBodyFromMdx } from '@/actions/admin'

export default async function EditLessonPage({ params }: { params: { id: string } }) {
  const lesson = await db.lesson.findUnique({ where: { id: params.id }, include: { module: { include: { training: { include: { modules: true } } } } } })
  if (!lesson) return <div className="p-4">Lesson not found.</div>
  const training = lesson.module.training

  return (
    <div className="grid gap-6">

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Lesson settings</h2>
        <form action={async (fd: FormData) => { 'use server'; const data = { title: String(fd.get('title')||lesson.title), slug: String(fd.get('slug')||lesson.slug), moduleId: String(fd.get('moduleId')||lesson.moduleId), externalUrl: String(fd.get('externalUrl')||''), bodyMdx: String(fd.get('bodyMdx')||'') }; await updateLesson(lesson.id, data) }} className="grid gap-3 md:grid-cols-2 items-end">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input name="title" defaultValue={lesson.title} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input name="slug" defaultValue={lesson.slug} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Module</label>
            <select name="moduleId" defaultValue={lesson.moduleId} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm">
              {training.modules.map((m) => (
                <option key={m.id} value={m.id}>{training.title} • {m.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">External URL</label>
            <input name="externalUrl" defaultValue={lesson.externalUrl || ''} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Body (MDX)</label>
            <textarea name="bodyMdx" rows={10} defaultValue={lesson.bodyMdx || ''} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm font-mono" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Save</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Load content from MDX file</h2>
        <form action={async (fd: FormData) => { 'use server'; const slug = String(fd.get('mdxSlug')||''); if (slug) { await loadLessonBodyFromMdx(lesson.id, slug) } }} className="grid gap-3 md:grid-cols-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">MDX slug (without .mdx)</label>
            <input name="mdxSlug" placeholder="intro" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Load</button>
          </div>
        </form>
      </section>
    </div>
  )
}
