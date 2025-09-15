import Link from "next/link"
import { Fragment } from "react"
import { db } from "@/lib/db"
import { createUpload, updateUpload, deleteUpload, importManualsFromUrls } from "@/actions/uploads"
import ConfirmDelete from "@/components/ConfirmDelete"
import ToggleDetails from "@/components/ToggleDetails"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"

const DEFAULT_USE_CASES = [
  'APIs',
  'Social Media',
  'Icecat Commerce',
  'Various',
] as const

// Editor tag options (used like Documents' tags)
const MANUAL_TAGS = [
  'APIs',
  'Social Media',
  'Icecat Commerce',
  'Various',
  'Brand Cloud',
  'Reviews',
  'Product Story',
  'Sustainability',
] as const

export default async function EditorManualsPage({ searchParams }: { searchParams?: { uc?: string; edit?: string } }) {
  const uc = (searchParams?.uc || '').toString()
  const editId = (searchParams?.edit || '').toString()
  const where: any = { kind: 'DOCUMENT', tags: { has: 'manual' } }
  const itemsRaw = await db.upload.findMany({ where, orderBy: { updatedAt: 'desc' }, select: { id:true, title:true, path:true, tags:true, updatedAt:true } as any })
  const normalizeUC = (m: any) => {
    const v = m.useCase ?? ((m.tags || []).find((t: string) => t.startsWith('usecase:'))?.slice('usecase:'.length) ?? '')
    return v === 'Reference files' ? '' : v
  }
  const items = itemsRaw.map((m) => ({ ...m, _uc: normalizeUC(m) }))
  const dynamicUC = Array.from(new Set(items.map((a: any) => a._uc).filter((v: string) => Boolean(v) && v !== 'Reference files')))
  const useCases = Array.from(new Set<string>([...DEFAULT_USE_CASES, ...dynamicUC]))
  const filtered = uc ? items.filter((m: any) => m._uc === uc) : items

  const groupsOrder = uc ? [uc] : [...useCases, 'Uncategorized']
  const byGroup: Record<string, any[]> = {}
  for (const it of filtered) {
    const key = it._uc || 'Uncategorized'
    if (!byGroup[key]) byGroup[key] = []
    byGroup[key].push(it)
  }

  const editing = editId ? await db.upload.findUnique({ where: { id: editId }, select: { id:true, title:true, path:true, tags:true, updatedAt:true } as any }) : null as any

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-medium">Add new</h2>
        {/* Inline edit appears inside the list rows below */}
        <form
          action={async (fd: FormData) => { 'use server'; fd.append('kind','DOCUMENT'); fd.append('isManual','1'); fd.append('tags','manual'); await createUpload(fd) }}
          className="grid gap-3 md:grid-cols-6 items-end mt-4"
        >
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">URL (leave empty if uploading attachment)</label>
            <input name="path" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm mb-1">Tag</label>
            <div className="flex items-center gap-3 flex-wrap">
              {MANUAL_TAGS.map((t) => (
                <label key={t} className="text-sm"><input type="radio" name="usecase" value={t} className="mr-2" /> {t}</label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
          <div className="flex items-center gap-2">
            <SubmitButton label="Add manual" pendingLabel="Adding..." className="bg-violet-500 text-white hover:bg-violet-600 border-violet-600" />
            <SaveStatus />
          </div>
        </form>
        <div className="mt-6 border-t pt-4">
          <h3 className="text-base font-medium">Bulk import from URLs</h3>
          <p className="text-xs text-neutral-600 mt-1">Paste one URL per line. We will fetch titles automatically. Use Case is left empty.</p>
          <form action={async (fd: FormData) => { 'use server'; await importManualsFromUrls(fd) }} className="mt-3 grid gap-3 md:grid-cols-6 items-end">
            <div className="md:col-span-5">
              <label className="block text-sm mb-1">URLs</label>
              <textarea name="urls" rows={4} placeholder="https://example.com/post-1
https://example.com/post-2" className="w-full rounded-xl border px-3 py-2 text-sm"></textarea>
            </div>
            <div>
              <SubmitButton label="Import" pendingLabel="Importing..." />
            </div>
          </form>
        </div>
      </section>

      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{group}</div>
            <table className="w-full table-auto text-xs">
              <thead className="bg-neutral-50/80 text-neutral-600">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-24 border-l border-[hsl(var(--border))]">Type</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-24 border-l border-[hsl(var(--border))]">Format</th>
                  <th className="py-2 px-3 text-right text-xs font-medium w-[320px] border-l border-[hsl(var(--border))]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m: any) => (
                  <Fragment key={m.id}>
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-xs text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{m.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">
                      <code className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px]">{fileFormat(m.path)}</code>
                    </td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))]">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap overflow-x-auto">
                        <ToggleDetails targetId={`edit-${m.id}`} />
                        <form action={async () => { 'use server'; await deleteUpload(m.id) }}>
                          <ConfirmDelete />
                        </form>
                        <form action={async (fd: FormData) => { 'use server'; await updateUpload(fd) }} className="inline-flex items-center gap-2">
                          <input type="hidden" name="id" defaultValue={m.id} />
                          <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-2 py-1" />
                          <SaveStatus />
                        </form>
                      </div>
                    </td>
                  </tr>
                  <tr key={`edit-${m.id}-details`}>
                    <td colSpan={5} className="bg-neutral-50">
                      <details id={`edit-${m.id}`} open={editId === m.id}>
                        <summary className="hidden">Edit</summary>
                        <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                          <form action={async (fd: FormData) => { 'use server'; await updateUpload(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                            <input type="hidden" name="id" defaultValue={m.id} />
                            <div className="md:col-span-2">
                              <label className="block text-sm mb-1">Title</label>
                              <input name="title" defaultValue={m.title} required className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm mb-1">URL</label>
                              <input name="path" defaultValue={m.path} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://..." />
                            </div>
                            <div className="md:col-span-6">
                              <label className="block text-sm mb-1">Tag</label>
                              <div className="flex items-center gap-3 flex-wrap">
                                {MANUAL_TAGS.map((t) => (
                                  <label key={t} className="text-sm"><input type="radio" name="usecase" value={t} defaultChecked={m._uc === t} className="mr-2" /> {t}</label>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <SubmitButton label="Update" pendingLabel="Updating..." className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700" />
                              <SaveStatus />
                              <ToggleDetails targetId={`edit-${m.id}`} label="Cancel" className="px-3 py-1 rounded-full border text-xs" />
                            </div>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </section>
        ) : null
      ))}
    </div>
  )
}

function fileFormat(path: string) {
  try {
    const name = (path || '').split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const ext = (noGz.split('.').pop() || '').toUpperCase()
    return ext || '—'
  } catch { return '—' }
}
