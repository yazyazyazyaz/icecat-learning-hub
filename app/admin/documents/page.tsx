import Link from "next/link"
import { db } from "@/lib/db"
import { createDocument, updateDocument } from "@/actions/documents"
import { syncRefsFromFrostKitty } from "@/actions/refs"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"

const DOC_TAGS = [
  'Contracts',
  'Various documents',
  'Index File',
  'Reference File',
] as const

export default async function AdminDocumentsPage({ searchParams }: { searchParams?: { tag?: string; edit?: string } }) {
  const tag = (searchParams?.tag || '').toString()
  const editId = (searchParams?.edit || '').toString()
  const where: any = tag ? { tags: { has: tag } } : {}
  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { updatedAt: 'desc' } })
  } catch {
    try {
      const legacyWhere: any = { kind: 'DOCUMENT', NOT: { tags: { has: 'manual' } } }
      if (tag) legacyWhere.tags = { has: tag }
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { updatedAt: 'desc' } })
    } catch (e) {
      console.error('AdminDocumentsPage: DB unavailable', e)
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
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-gray-600 mt-1">Add documents via URL or file upload. Shown on the Documents page.</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap max-w-5xl">
          <Link className={`tag-chip ${!tag? 'tag-chip--active':''}`} href={`/admin/documents`}>All</Link>
          {DOC_TAGS.map((t) => (
            <Link key={t} className={`tag-chip ${tag===t? 'tag-chip--active':''}`} href={`/admin/documents?tag=${encodeURIComponent(t)}`}>{t}</Link>
          ))}
        </div>
        <form action={async () => { 'use server'; await syncRefsFromFrostKitty() }} className="mt-3">
          <SubmitButton label="Sync Icecat Refs (Index + Reference Files)" pendingLabel="Syncing..." />
          <SaveStatus className="ml-2" />
        </form>
        {editing && (
          <form action={async (fd: FormData) => { 'use server'; await updateDocument(fd) }} className="grid gap-3 md:grid-cols-6 items-end mt-4">
            <input type="hidden" name="id" defaultValue={editing.id} />
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Title</label>
              <input name="title" defaultValue={editing.title} required className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">URL</label>
              <input name="path" defaultValue={editing.path} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div className="flex items-center gap-2"><SubmitButton label="Update document" pendingLabel="Updating..." /><SaveStatus /></div>
          </form>
        )}
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
            <table className="w-full table-auto text-sm">
              <thead className="bg-neutral-50/80 text-neutral-600">
                <tr>
                  <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-24 border-l border-[hsl(var(--border))]">Type</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-36 border-l border-[hsl(var(--border))]">Link</th>
                  <th className="py-2 px-3 text-left text-xs font-medium w-28 border-l border-[hsl(var(--border))]">Updated</th>
                  <th className="py-2 px-3 text-right text-xs font-medium w-[200px] border-l border-[hsl(var(--border))]">Actions</th>
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
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                      <Link href={`/admin/documents?edit=${m.id}`} className="px-3 py-1 rounded-full border text-xs">Edit</Link>
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
