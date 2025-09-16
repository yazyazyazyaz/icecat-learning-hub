import Link from "next/link"
import { db } from "@/lib/db"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"
import { createDocument, updateDocument, deleteDocument } from "@/actions/documents"
import ConfirmDelete from "@/components/ConfirmDelete"
import ToggleDetails from "@/components/ToggleDetails"

const GROUPS = ['Index File','Reference File'] as const

export default async function EditorIntegrationFilesPage({ searchParams }: { searchParams?: { group?: string; scope?: string; edit?: string } }) {
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
      console.error('EditorIntegrationFilesPage: DB unavailable', e2)
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

  const scopeTag = scope === 'full' ? 'full' : 'open'

  return (
    <div className="space-y-4">
      <section className="max-w-5xl">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            className={`tag-chip ${group==='All' ? 'bg-sky-100 border-sky-400 text-sky-900 hover:border-sky-400 hover:text-sky-900' : ''}`}
            href={`/editor/integration?scope=${scopeTag}`}
          >
            All
          </Link>
          {GROUPS.map((g) => (
            <Link
              key={g}
              className={`tag-chip ${group===g ? 'bg-sky-100 border-sky-400 text-sky-900 hover:border-sky-400 hover:text-sky-900' : ''}`}
              href={`/editor/integration?scope=${scopeTag}&group=${encodeURIComponent(g)}`}
            >
              {displayGroupName(g)}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Link
            className={`tag-chip ${scope==='open' ? 'bg-amber-50 border-amber-300 text-amber-800' : ''}`}
            href={`/editor/integration?scope=open&group=${encodeURIComponent(group)}`}
          >
            Open Icecat
          </Link>
          <Link
            className={`tag-chip ${scope==='full' ? 'bg-amber-50 border-amber-300 text-amber-800' : ''}`}
            href={`/editor/integration?scope=full&group=${encodeURIComponent(group)}`}
          >
            Full Icecat
          </Link>
        </div>
      </section>

      {/* Add new (separate bracket) */}
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-medium">Add new link</h2>
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
          <div className="md:col-span-5">
            <label className="block text-sm mb-1">Description</label>
            <textarea name="description" className="w-full rounded-xl border px-3 py-2 text-sm" rows={2} placeholder="Short description (optional)" />
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm mb-1">Groups</label>
            <div className="flex items-center gap-3 flex-wrap">
              {GROUPS.map((t) => (
                <label key={t} className="text-sm"><input type="checkbox" name="tags" value={t} className="mr-2" /> {displayGroupName(t)}</label>
              ))}
            </div>
            <div className="mt-2 text-xs text-neutral-600">Access level (only for Reference Files):</div>
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:open" className="mr-2" /> Open Icecat</label>
              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:full" className="mr-2" /> Full Icecat</label>
            </div>
          </div>
          <div className="flex items-center gap-2"><SubmitButton label="Add link" pendingLabel="Adding..." className="bg-violet-500 text-white hover:bg-violet-600 border-violet-600" /><SaveStatus /></div>
        </form>
      </section>

      {/* Header */}
      <section className="max-w-5xl">
        <div className="grid grid-cols-[1fr_14rem_12rem_28rem] text-xs text-neutral-600 bg-neutral-50/80">
          <div className="py-2 px-3">Title</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Type</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Format</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">Action</div>
        </div>
      </section>

      {groupsOrder.map((g) => (
        byGroup[g] && byGroup[g].length > 0 ? (
          <section key={g} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{displayGroupName(g)}</div>
            <ul className="divide-y divide-[hsl(var(--border))]">
              {byGroup[g].map((m: any) => (
                <li key={m.id} className="grid grid-cols-[1fr_14rem_12rem_28rem] items-center text-xs">
                  <div className="py-2 px-3 text-neutral-900 truncate" title={m.title}>{m.title}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">{typeLabel(m)}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">
                    <code className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px]">{fileFormat(m.path)}</code>
                  </div>
                    <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                      <span className="inline-flex items-center gap-3">
                        <a className="underline" href={m.path} target="_blank" rel="noreferrer">Link</a>
                        <a className="underline" href={m.path} target="_blank" rel="noreferrer">Download</a>
                        <ToggleDetails targetId={`edit-${m.id}`} />
                        <form action={async () => { 'use server'; await deleteDocument(m.id) }}>
                          <ConfirmDelete />
                        </form>
                      </span>
                    </div>
                    <details id={`edit-${m.id}`} className="col-span-4">
                      <summary className="hidden">Edit</summary>
                      <div className="p-4 border-t border-[hsl(var(--border))] bg-neutral-50 animate-in fade-in-0 duration-200">
                          <form action={async (fd: FormData) => { 'use server'; await updateDocument(fd) }} className="grid gap-4 md:grid-cols-8 items-end">
                          <input type="hidden" name="id" defaultValue={m.id} />
                          <input type="hidden" name="tags__sent" defaultValue="1" />
                          <div className="md:col-span-3">
                            <label className="block text-sm mb-1">Title</label>
                            <input name="title" defaultValue={m.title} required className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                          </div>
                          <div className="md:col-span-5">
                            <label className="block text-sm mb-1">URL</label>
                            <input name="path" defaultValue={m.path} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://..." />
                          </div>
                          <div className="md:col-span-8">
                            <label className="block text-sm mb-1">Description</label>
                            <textarea name="description" defaultValue={getDesc(m) || ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" rows={3} placeholder="Short description (optional)" />
                          </div>
                          <div className="md:col-span-8">
                            <label className="block text-sm mb-1">Groups</label>
                            <div className="flex items-center gap-3 flex-wrap">
                              {GROUPS.map((t) => (
                                <label key={t} className="text-sm"><input type="checkbox" name="tags" value={t} defaultChecked={hasTag(m, t)} className="mr-2" /> {displayGroupName(t)}</label>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-neutral-600">Access level (only for Reference Files):</div>
                            <div className="flex items-center gap-3 flex-wrap mt-1">
                              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:open" defaultChecked={hasTag(m,'refscope:open')} className="mr-2" /> Open Icecat</label>
                              <label className="text-sm"><input type="checkbox" name="tags" value="refscope:full" defaultChecked={hasTag(m,'refscope:full')} className="mr-2" /> Full Icecat</label>
                            </div>
                          </div>
                          <div className="md:col-span-8 flex items-center gap-3 pt-1">
                            <SubmitButton label="Update" pendingLabel="Updating..." className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700" />
                            <SaveStatus />
                          </div>
                        </form>
                    </div>
                  </details>
                    {/* Delete moved next to Edit */}
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

function fileFormat(path: string) {
  try {
    const name = (path || '').split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const ext = (noGz.split('.').pop() || '').toUpperCase()
    return ext || '—'
  } catch { return '—' }
}

function getDesc(m: any): string | null {
  try {
    if (typeof m.useCase === 'string' && m.useCase.trim()) return m.useCase
    const t = Array.isArray(m.tags) ? (m.tags as any as string[]) : []
    const found = t.find((x) => typeof x === 'string' && x.startsWith('desc:'))
    return found ? found.slice(5) : null
  } catch { return null }
}

function displayGroupName(name: string): string {
  try {
    if (name === 'Index File') return 'Index Files'
    if (name === 'Reference File') return 'Reference Files'
    return name
  } catch { return name }
}

function typeLabel(m: any): string {
  try {
    const open = hasTag(m, 'refscope:open')
    const full = hasTag(m, 'refscope:full')
    if (open && full) return 'For both'
    if (open) return 'Open Icecat'
    if (full) return 'Full Icecat'
    return '—'
  } catch { return '—' }
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

