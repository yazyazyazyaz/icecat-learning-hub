import Link from "next/link"
import { Fragment } from "react"
import { db } from "@/lib/db"
import { createDocument, updateDocument, deleteDocument, importDocumentsFromCSV } from "@/actions/documents"
import ConfirmDelete from "@/components/ConfirmDelete"
import ToggleDetails from "@/components/ToggleDetails"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"
import { isAttachmentPath } from "@/lib/uploads"

const DOC_TAGS = [
  'Contracts',
  'Various documents',
  'Internal documents',
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

  // Group by tag for editor view (Contracts / Various documents / Internal documents / Uncategorized)
  // Deduplicate by normalized path (ignoring query/hash) or title if no path
  function normalizePath(p: string): string {
    try {
      const u = new URL(p, 'https://example.com')
      const isAbs = /^https?:\/\//i.test(p)
      const key = (isAbs ? (u.host + u.pathname) : u.pathname).toLowerCase().replace(/\/+$/, '')
      return key || p.toLowerCase()
    } catch { return (p || '').toLowerCase() }
  }
  function normalizeTitle(t: string): string { return (t || '').trim().toLowerCase() }
  {
    const byKey = new Map<string, any>()
    for (const it of items) {
      const key = (it.path ? normalizePath(String(it.path)) : '') || normalizeTitle(String(it.title))
      const prev = byKey.get(key)
      if (!prev) byKey.set(key, it)
      else {
        try {
          const a = new Date(it.updatedAt as any).getTime() || 0
          const b = new Date(prev.updatedAt as any).getTime() || 0
          if (a >= b) byKey.set(key, it)
        } catch {}
      }
    }
    items = Array.from(byKey.values())
  }

  const groupsOrder = tag ? [tag] : ['Contracts','Various documents','Internal documents','Uncategorized']
  const byGroup: Record<string, any[]> = {}
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => (['Contracts','Various documents','Internal documents'] as const).includes(t as any))
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
            <label className="block text-sm mb-1">Tag</label>
            <div className="flex items-center gap-3 flex-wrap">
              {DOC_TAGS.map((t) => (
                <label key={t} className="text-sm"><input type="radio" name="tag" value={t} className="mr-2" /> {t}</label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
          <div className="flex items-center gap-2"><SubmitButton label="Add document" pendingLabel="Adding..." className="bg-violet-500 text-white hover:bg-violet-600 border-violet-600" /><SaveStatus /></div>
        </form>
        <div className="mt-6 border-t pt-4">
          <h3 className="text-base font-medium">Bulk import (CSV)</h3>
          <p className="text-xs text-neutral-600 mt-1">Paste CSV lines with columns: Name, Links, Assignee, Attachment, Detail, Last modification. Link or Attachment URL is required.</p>
          <form action={async (fd: FormData)=>{ 'use server'; await importDocumentsFromCSV(fd) }} className="mt-3 grid gap-3 md:grid-cols-6 items-end">
            <div className="md:col-span-5">
              <label className="block text-sm mb-1">Rows</label>
              <textarea name="csv" rows={6} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Name,Links,Assignee,Attachment,Detail,Last modification"></textarea>
            </div>
            <div>
              <label className="block text-sm mb-1">Default tag</label>
              <select name="defaultTag" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" defaultValue="Various documents">
                <option value="">(none)</option>
                <option value="Contracts">Contracts</option>
                <option value="Various documents">Various documents</option>
                <option value="Internal documents">Internal documents</option>
              </select>
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
              <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700 flex items-center gap-2">
                <span aria-hidden className="text-base leading-none">{emojiForDocTag(group)}</span>
                <span>{group}</span>
              </div>
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
          <Fragment key={m.id}>
            <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-xs text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{isAttachmentPath(m.path) ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      {isAttachmentPath(m.path) ? (
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
                        </div>
                      </td>
            </tr>
            <tr key={`edit-${m.id}-details`}>
                    <td colSpan={5} className="bg-neutral-50">
                      <details id={`edit-${m.id}`} open={editId === m.id}>
                        <summary className="hidden">Edit</summary>
                        <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                          <form action={async (fd: FormData) => { 'use server'; await updateDocument(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                            <input type="hidden" name="id" defaultValue={m.id} />
                            <input type="hidden" name="tags__sent" defaultValue="1" />
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
                                {DOC_TAGS.map((t) => (
                                  <label key={t} className="text-sm"><input type="radio" name="tag" value={t} defaultChecked={(m.tags||[]).includes(t)} className="mr-2" /> {t}</label>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm mb-1">Or upload attachment (optional)</label>
                              <input name="file" type="file" className="w-full text-sm" />
                              <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
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
function emojiForDocTag(tag: string): string {
  switch (tag) {
    case 'Contracts': return '🧾'
    case 'Various documents': return '🗂️'
    case 'Internal documents': return '🏢'
    default: return '📄'
  }
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

