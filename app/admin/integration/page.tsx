import Link from "next/link"
import { db } from "@/lib/db"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"
import { createDocument, updateDocument } from "@/actions/documents"
import { syncRefsFromFrostKitty, syncRefsFromIcecat } from "@/actions/refs"
import LinkActions from "@/components/LinkActions"

const GROUPS = ['Index File','Reference File'] as const

export default async function AdminIntegrationFilesPage({ searchParams }: { searchParams?: { group?: string; scope?: string; edit?: string } }) {
  const groupRaw = (searchParams?.group || '').toString()
  const group = groupRaw || 'All'
  const rawScope = (searchParams?.scope || '').toString().toLowerCase()
  const scope = rawScope || 'open'
  const editId = (searchParams?.edit || '').toString()
  const where: any = {}
  if (group === 'Index File') {
    where.tags = { has: 'Index File' }
  } else if (group === 'Reference File') {
    where.tags = { hasEvery: ['Reference File', scope === 'full' ? 'refscope:full' : 'refscope:open'] }
  } else {
    where.OR = [
      { tags: { has: 'Index File' } },
      { tags: { hasEvery: ['Reference File', scope === 'full' ? 'refscope:full' : 'refscope:open'] } },
    ]
  }

  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { updatedAt: 'desc' } })
  } catch (e) {
    try {
      const legacyWhere: any = { kind: 'DOCUMENT' }
      if (group && GROUPS.includes(group as any)) legacyWhere.tags = { has: group }
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { updatedAt: 'desc' } })
    } catch (e2) {
      console.error('AdminIntegrationFilesPage: DB unavailable', e2)
      items = []
    }
  }

  const groupsOrder = group === 'All' ? [...GROUPS] : [group]
  const byGroup: Record<string, any[]> = {}
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => GROUPS.includes(t as any))
    const key = itsTags[0] || 'Reference File'
    if (!byGroup[key]) byGroup[key] = []
    byGroup[key].push(it)
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
        <h1 className="text-2xl font-semibold">Integration Files</h1>
        <p className="text-sm text-gray-600 mt-1">Index / Reference files used for integrations (Open vs Full).</p>
        <div className="mt-4 flex items-center gap-2 flex-wrap max-w-5xl">
          <span className="text-xs text-neutral-500">Access level:</span>
          <Link
            className={`tag-chip ${scope==='open'? 'tag-chip--active':''} ${scope==='open' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'hover:border-emerald-300 hover:text-emerald-800'}`}
            href={`/admin/integration?scope=open&group=${encodeURIComponent(group)}`}
          >
            Open Icecat
          </Link>
          <Link
            className={`tag-chip ${scope==='full'? 'tag-chip--active':''} ${scope==='full' ? 'bg-sky-50 border-sky-300 text-sky-800' : 'hover:border-sky-300 hover:text-sky-800'}`}
            href={`/admin/integration?scope=full&group=${encodeURIComponent(group)}`}
          >
            Full Icecat
          </Link>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap max-w-5xl">
          <span className="text-xs text-neutral-500">Groups:</span>
          <Link
            className={`tag-chip ${group==='All'? 'tag-chip--active':''} ${group==='All' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'hover:border-amber-300 hover:text-amber-800'}`}
            href={`/admin/integration?scope=${scope}`}
          >
            All
          </Link>
          {GROUPS.map((g) => (
            <Link
              key={g}
              className={`tag-chip ${group===g? 'tag-chip--active':''} ${group===g ? 'bg-amber-50 border-amber-300 text-amber-800' : 'hover:border-amber-300 hover:text-amber-800'}`}
              href={`/admin/integration?scope=${scope}&group=${encodeURIComponent(g)}`}
            >
              {g}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <form action={async () => { 'use server'; await syncRefsFromFrostKitty() }}>
            <SubmitButton label="Sync Frost-Kitty (Index/Reference)" pendingLabel="Syncing..." />
            <SaveStatus className="ml-2" />
          </form>
          <form action={async () => { 'use server'; await syncRefsFromIcecat() }}>
            <SubmitButton label="Import Icecat Reference Files (Open & Full)" pendingLabel="Importing..." />
            <SaveStatus className="ml-2" />
          </form>
        </div>

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
            <div className="flex items-center gap-2"><SubmitButton label="Update link" pendingLabel="Updating..." /><SaveStatus /></div>
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
            <label className="block text-sm mb-1">URL</label>
            <input name="path" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm mb-1">Groups</label>
            <div className="flex items-center gap-3 flex-wrap">
              {GROUPS.map((t) => (
                <label key={t} className="text-sm"><input type="checkbox" name="tags" value={t} className="mr-2" /> {t}</label>
              ))}
            </div>
            <div className="mt-2 text-xs text-neutral-600">Access level (only for Reference File):</div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:open" className="mr-2" /> Open Icecat</label>
              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:full" className="mr-2" /> Full Icecat</label>
            </div>
          </div>
          <div className="flex items-center gap-2"><SubmitButton label="Add link" pendingLabel="Adding..." /><SaveStatus /></div>
        </form>
      </section>

      {/* Header */}
      <section className="max-w-5xl">
        <div className="grid grid-cols-[1fr_12rem_8rem_12rem_8rem_10rem] text-xs text-neutral-600 bg-neutral-50/80">
          <div className="py-2 px-3">Title</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Type</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Format</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Link</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Updated</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">Actions</div>
        </div>
      </section>

      {groupsOrder.map((g) => (
        byGroup[g] && byGroup[g].length > 0 ? (
          <section key={g} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{g}</div>
            <ul className="divide-y divide-[hsl(var(--border))]">
              {byGroup[g].map((m: any) => (
                <li key={m.id} className="grid grid-cols-[1fr_12rem_8rem_12rem_8rem_10rem] items-center text-sm">
                  <div className="py-2 px-3 text-[15px] text-neutral-900 truncate" title={m.title}>{m.title}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border align-middle">
                      <span className={`h-2 w-2 rounded-full ${hasTag(m,'refscope:open') ? 'bg-emerald-600' : hasTag(m,'refscope:full') ? 'bg-sky-600' : 'bg-neutral-400'}`}></span>
                      {hasTag(m,'refscope:open') ? 'Open Icecat' : hasTag(m,'refscope:full') ? 'Full Icecat' : '—'}
                    </span>
                  </div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">{formatFromURL(m.path)}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                    <LinkActions href={m.path} />
                  </div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-600 whitespace-nowrap">{m.updatedAt.toISOString().slice(0,10)}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                    <Link href={`/admin/integration?edit=${m.id}`} className="px-3 py-1 rounded-full border text-xs">Edit</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      ))}
    </div>
  )
}

function fileType(path: string) {
  try {
    const name = (path || '').split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const ext = (noGz.split('.').pop() || '').toUpperCase()
    return ext ? `Link (${ext})` : 'Link'
  } catch { return 'Link' }
}

function hasTag(m: any, t: string) {
  try { return Array.isArray(m.tags) && m.tags.includes(t) } catch { return false }
}
