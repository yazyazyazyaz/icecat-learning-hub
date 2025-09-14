import Link from "next/link"
import { db } from "@/lib/db"
import { createUpload, updateUpload } from "@/actions/uploads"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"

const DEFAULT_USE_CASES = [
  'APIs',
  'Social Media',
  'Icecat Commerce',
  'Various',
] as const

export default async function AdminManualsPage({ searchParams }: { searchParams?: { uc?: string; edit?: string } }) {
  const uc = (searchParams?.uc || '').toString()
  const editId = (searchParams?.edit || '').toString()
  const where: any = { kind: 'DOCUMENT', tags: { has: 'manual' } }
  let itemsRaw: any[] = []
  try {
    itemsRaw = await db.upload.findMany({ where, orderBy: { updatedAt: 'desc' }, select: { id:true, title:true, path:true, tags:true, updatedAt:true } as any })
  } catch (e) {
    console.error('AdminManualsPage: DB unavailable', e)
    itemsRaw = []
  }
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

  let editing: any = null
  if (editId) {
    try { editing = await db.upload.findUnique({ where: { id: editId }, select: { id:true, title:true, path:true, tags:true, updatedAt:true } as any }) } catch {}
  }

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-semibold">Manuals</h1>
        <p className="text-sm text-gray-600 mt-1">Add manuals as links. They appear on the Manuals page.</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap max-w-5xl">
          <Link className={`tag-chip ${!uc? 'tag-chip--active':''}`} href={`/admin/manuals`}>All</Link>
          {useCases.map((c) => (
            <Link key={c} className={`tag-chip ${uc===c? 'tag-chip--active':''}`} href={`/admin/manuals?uc=${encodeURIComponent(c)}`}>{c}</Link>
          ))}
        </div>
        {editing && (
          <form
            action={async (fd: FormData) => { 'use server'; await updateUpload(fd) }}
            className="grid gap-3 md:grid-cols-6 items-end mt-4"
          >
            <input type="hidden" name="id" defaultValue={editing.id} />
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Title</label>
              <input name="title" defaultValue={editing.title} required className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">URL</label>
              <input name="path" defaultValue={editing.path} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm mb-1">Use Case</label>
              <select name="usecase" defaultValue={normalizeUC(editing) || ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
                <option value="">(none)</option>
                {useCases.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            
            <div>
              <button className="rounded-full border px-4 py-2 text-sm">Update manual</button>
            </div>
          </form>
        )}
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
          <div>
            <label className="block text-sm mb-1">Use Case</label>
            <select name="usecase" className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
              {useCases.map((c) => (<option key={c} value={c}>{c}</option>))}
              <option value="custom">Custom…</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Custom Use Case (optional)</label>
            <input name="usecase_new" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Integrations" />
            <p className="text-xs text-neutral-500 mt-1">Used only if Use Case = Custom.</p>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
          <div className="flex items-center gap-2">
            <SubmitButton label="Add manual" pendingLabel="Adding..." />
            <SaveStatus />
          </div>
        </form>
      </section>

      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{group}</div>
            <table className="w-full table-auto text-sm">
              <thead className="bg-neutral-50/80 text-neutral-600">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-24 border-l border-[hsl(var(--border))]">Type</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-36 border-l border-[hsl(var(--border))]">Link</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-28 border-l border-[hsl(var(--border))]">Updated</th>
                  <th className="py-2 px-3 text-right text-xs font-medium w-[260px] border-l border-[hsl(var(--border))]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m: any) => (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-[15px] text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{m.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      {m.path?.startsWith('/uploads/') ? (
                        <span className="space-x-3">
                          <a className="underline font-medium" href={m.path} target="_blank" rel="noreferrer">Preview</a>
                          <a className="underline text-neutral-700" href={m.path} download>Download</a>
                        </span>
                      ) : (
                        <a className="underline font-medium" href={m.path} target="_blank" rel="noreferrer">Open</a>
                      )}
                    </td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-600 whitespace-nowrap">{m.updatedAt.toISOString().slice(0,10)}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))]">
                      <form action={async (fd: FormData) => { 'use server'; await updateUpload(fd) }} className="flex items-center justify-end gap-2 whitespace-nowrap overflow-x-auto">
                        <input type="hidden" name="id" defaultValue={m.id} />
                        <select name="usecase" defaultValue={m._uc || ''} className="rounded-xl border px-2 py-1 text-xs bg-white">
                          <option value="">(none)</option>
                          {useCases.map((c) => (<option key={c} value={c}>{c}</option>))}
                          <option value="custom">Custom…</option>
                        </select>
                        <input name="usecase_new" placeholder="Custom" className="rounded-xl border px-2 py-1 text-xs" />
                        <Link href={`/admin/manuals?edit=${m.id}`} className="px-3 py-1 rounded-full border text-xs">Edit</Link>
                        <div className="flex items-center gap-2">
                          <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-2 py-1" />
                          <SaveStatus />
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null
      ))}
    </div>
  )
}
