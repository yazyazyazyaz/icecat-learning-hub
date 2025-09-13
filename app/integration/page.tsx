import Link from "next/link"
import { db } from "@/lib/db"
import LinkActions from "@/components/LinkActions"

const GROUPS = ['Index File','Reference File'] as const

export default async function IntegrationFilesPage({ searchParams }: { searchParams?: { group?: string; scope?: string } }) {
  const groupRaw = (searchParams?.group || '').toString()
  const group = groupRaw || 'All'
  const rawScope = (searchParams?.scope || '').toString().toLowerCase()
  const scope = rawScope || 'open'
  const where: any = {}
  if (group === 'Index File') {
    where.tags = { has: 'Index File' }
  } else if (group === 'Reference File') {
    where.tags = { hasEvery: ['Reference File', scope === 'full' ? 'refscope:full' : 'refscope:open'] }
  } else { // All
    where.OR = [
      { tags: { has: 'Index File' } },
      { tags: { hasEvery: ['Reference File', scope === 'full' ? 'refscope:full' : 'refscope:open'] } },
    ]
  }

  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { title: 'asc' } })
  } catch (e) {
    try {
      const legacyWhere: any = { kind: 'DOCUMENT' }
      if (group && GROUPS.includes(group as any)) legacyWhere.tags = { has: group }
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { title: 'asc' } })
    } catch (e2) {
      console.error('IntegrationFilesPage: DB unavailable', e2)
      items = []
    }
  }

  const groupsOrder = group ? [group] : [...GROUPS]
  const byGroup: Record<string, any[]> = {}
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => GROUPS.includes(t as any))
    const key = itsTags[0] || 'Reference File'
    if (!byGroup[key]) byGroup[key] = []
    byGroup[key].push(it)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <span className="text-xs text-neutral-500">Access level:</span>
        <Link
          className={`tag-chip ${scope==='open'? 'tag-chip--active':''} ${scope==='open' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'hover:border-emerald-300 hover:text-emerald-800'}`}
          href={`/integration?scope=open&group=${encodeURIComponent(group)}`}
        >
          Open Icecat
        </Link>
        <Link
          className={`tag-chip ${scope==='full'? 'tag-chip--active':''} ${scope==='full' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'hover:border-emerald-300 hover:text-emerald-800'}`}
          href={`/integration?scope=full&group=${encodeURIComponent(group)}`}
        >
          Full Icecat
        </Link>
      </div>
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <span className="text-xs text-neutral-500">Groups:</span>
        <Link
          className={`tag-chip ${group==='All'? 'tag-chip--active':''} ${group==='All' ? 'bg-amber-50 border-amber-300 text-amber-800' : 'hover:border-amber-300 hover:text-amber-800'}`}
          href={`/integration?scope=${scope}`}
        >
          All
        </Link>
        {GROUPS.map((g) => (
          <Link
            key={g}
            className={`tag-chip ${group===g? 'tag-chip--active':''} ${group===g ? 'bg-amber-50 border-amber-300 text-amber-800' : 'hover:border-amber-300 hover:text-amber-800'}`}
            href={`/integration?scope=${scope}&group=${encodeURIComponent(g)}`}
          >
            {g}
          </Link>
        ))}
      </div>

      <section className="max-w-5xl">
        <div className="grid grid-cols-[1fr_16rem_16rem] text-xs text-neutral-600 bg-neutral-50/80">
          <div className="py-2 px-3">Title</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Type</div>
          <div className="py-2 px-3 border-l border-[hsl(var(--border))]">Link</div>
        </div>
      </section>

      {groupsOrder.map((g) => (
        byGroup[g] && byGroup[g].length > 0 ? (
          <section key={g} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600">{g}</div>
            <ul className="divide-y divide-[hsl(var(--border))]">
              {byGroup[g].map((m: any) => (
                <li key={m.id} className="grid grid-cols-[1fr_16rem_16rem] items-center text-sm">
                  <div className="py-2 px-3 text-neutral-900 truncate" title={m.title}>{m.title}</div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border mr-2 align-middle" aria-label="Access level">
                      <span className={`h-2 w-2 rounded-full ${hasTag(m,'refscope:open') ? 'bg-emerald-600' : hasTag(m,'refscope:full') ? 'bg-emerald-600' : 'bg-neutral-400'}`}></span>
                      {hasTag(m,'refscope:open') ? 'Open Icecat' : hasTag(m,'refscope:full') ? 'Full Icecat' : '—'}
                    </span>
                    <span className="align-middle">{fileType(m.path)}</span>
                  </div>
                  <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-right">
                    <LinkActions href={m.path} />
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
