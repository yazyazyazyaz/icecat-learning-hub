import Link from "next/link"
import { db } from "@/lib/db"
import { createDocument, updateDocument, moveToIntegration, deleteDocument } from "@/actions/documents"
import ConfirmDelete from "@/components/ConfirmDelete"
import ToggleDetails from "@/components/ToggleDetails"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"

const DOC_TAGS = [
  'Contracts',
  'Various documents',
] as const

export default async function EditorDocumentsPage({ searchParams }: { searchParams?: { tag?: string; edit?: string } }) {
  const tag = (searchParams?.tag || '').toString()
  const editId = (searchParams?.edit || '').toString()
  const notIntegration = { OR: [ { tags: { has: 'Index File' } }, { tags: { has: 'Reference File' } } ] }
  const where: any = tag ? { AND: [ { tags: { has: tag } }, { NOT: notIntegration } ] } : { NOT: notIntegration }
  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { updatedAt: 'desc' } })
  } catch {
    try {
      const legacyWhere: any = {
        kind: 'DOCUMENT',
        AND: [
          { NOT: { tags: { has: 'manual' } } },
          { NOT: { OR: [ { tags: { has: 'Index File' } }, { tags: { has: 'Reference File' } } ] } },
        ],
      }
      if (tag) legacyWhere.AND.push({ tags: { has: tag } })
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { updatedAt: 'desc' } })
    } catch (e) {
      console.error('EditorDocumentsPage: DB unavailable', e)
      items = []
    }
  }

  const groupsOrder = tag ? [tag] : [...DOC_TAGS, 'Uncategorized']
  const byGroup: Record<string, any[]> = {}
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => DOC_TAGS.includes(t as any))
    if (itsTags.length === 0) {
      if (!byGroup['Uncategorized']) byGroup['Uncategorized'] = []
      byGroup['Uncategorized'].push(it)
    } else {
      for (const t of itsTags) {
        if (!byGroup[t]) byGroup[t] = []
        byGroup[t].push(it)
      }
    }
  }

  let editing: any = null
  if (editId) {
    try { editing = await (db as any).documentFile.findUnique({ where: { id: editId } }) }
    catch {
      try { editing = await db.upload.findUnique({ where: { id: editId } }) }
      catch {}
    }
  }

  return (
    <div className="space-y-4">
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-medium">Add new</h2>
        <form
          action={async (fd: FormData) => { 'use server'; await createDocument(fd) }}
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
            <label className="block text-sm mb-1">Tags</label>
            <div className="flex items-center gap-3 flex-wrap">
              {DOC_TAGS.map((t) => (
                <label key={t} className="text-sm"><input type="checkbox" name="tags" value={t} className="mr-2" /> {t}</label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
          <div className="flex items-center gap-2"><SubmitButton label="Add document" pendingLabel="Adding..." /><SaveStatus /></div>
        </form>
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
                  <th className="py-2 px-3 text-left text-xs font-medium w-36 border-l border-[hsl(var(--border))]">Link</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-28 border-l border-[hsl(var(--border))]">Updated</th>
                  <th className="py-2 px-3 text-right text-xs font-medium w-[320px] border-l border-[hsl(var(--border))]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m: any) => (
                  <>
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-xs text-neutral-900">{m.title}</td>
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
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-600 whitespace-nowrap">{fmtDate(m.updatedAt)}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap overflow-x-auto">
                          <ToggleDetails targetId={`edit-${m.id}`} />
                          <form action={async () => { 'use server'; await deleteDocument(m.id) }}>
                            <ConfirmDelete />
                          </form>
                        <form action={async (fd: FormData) => { 'use server'; await moveToIntegration(fd) }} className="inline-flex items-center gap-1">
                          <input type="hidden" name="id" defaultValue={m.id} />
                          <select name="group" className="h-7 rounded-full border text-xs px-2">
                            <option value="Index File">Index</option>
                            <option value="Reference File">Reference</option>
                          </select>
                          <select name="scope" className="h-7 rounded-full border text-xs px-2" defaultValue="open" title="Access (for Reference only)">
                            <option value="open">Open</option>
                            <option value="full">Full</option>
                          </select>
                          <button className="px-2 py-1 rounded-full border text-xs" title="Move to Integration Files">Move</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                    <tr>
                      <td colSpan={5} className="bg-neutral-50">
                        <details id={`edit-${m.id}`} open={editId === m.id}>
                          <summary className="hidden">Edit</summary>
                          <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                            <form action={async (fd: FormData) => { 'use server'; await updateDocument(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                              <input type="hidden" name="id" defaultValue={m.id} />
                              <div className="md:col-span-2">
                                <label className="block text-sm mb-1">Title</label>
                                <input name="title" defaultValue={m.title} required className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-sm mb-1">URL</label>
                                <input name="path" defaultValue={m.path} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://..." />
                              </div>
                              <div className="flex items-center gap-2">
                                <SubmitButton label="Update" pendingLabel="Updating..." className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700" />
                                <SaveStatus />
                                <Link href={`/editor/documents${tag?`?tag=${encodeURIComponent(tag)}`:''}`} className="px-3 py-1 rounded-full border text-xs">Cancel</Link>
                              </div>
                            </form>
                          </div>
                        </details>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </section>
        ) : null
      ))}
    </div>
  )
}

function fmtDate(d: any) {
  try {
    const dt = d instanceof Date ? d : new Date(d)
    const iso = dt.toISOString()
    return iso.slice(0, 10)
  } catch {
    return ''
  }
}

