import Link from "next/link"
import { db } from "@/lib/db"
import ActionButtons from "@/components/ActionButtons"
import DetailTitle from "@/components/DetailTitle"
// no client components needed here

export const revalidate = 3600

const GROUPS = ["Index File", "Reference File"] as const

export default async function IntegrationFilesPage({ searchParams }: { searchParams?: { scope?: string; group?: string } }) {
  const rawScope = (searchParams?.scope || "").toString().toLowerCase()
  const scope = rawScope === "full" ? "full" : "open"
  const groupRaw = (searchParams?.group || '').toString()
  const group = groupRaw || 'All'

  let items: any[] = []
  try {
    const where: any = {}
    const scopeTag = scope === 'full' ? 'refscope:full' : 'refscope:open'
    if (group === 'Index File') {
      // Only show selected scope for Index File
      where.tags = { hasEvery: ['Index File', scopeTag] }
    } else if (group === 'Reference File') {
      // Fetch both scopes to allow alignment across Open/Full
      where.tags = { has: 'Reference File' }
    } else {
      // All: filter Index by selected scope, but include all Reference to pair
      where.OR = [
        { tags: { hasEvery: ['Index File', scopeTag] } },
        { tags: { has: 'Reference File' } },
      ]
    }
    items = await (db as any).documentFile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, path: true, tags: true, updatedAt: true },
    })
  } catch {
    try {
      const legacyWhere: any = { kind: 'DOCUMENT' as any }
      const scopeTag = scope === 'full' ? 'refscope:full' : 'refscope:open'
      if (group === 'Index File') {
        legacyWhere.tags = { hasEvery: ['Index File', scopeTag] }
      } else if (group === 'Reference File') {
        legacyWhere.tags = { has: 'Reference File' }
      } else {
        // All: include reference (all) and index filtered by scope
        legacyWhere.OR = [
          { tags: { hasEvery: ['Index File', scopeTag] } },
          { tags: { has: 'Reference File' } },
        ]
      }
      items = await db.upload.findMany({
        where: legacyWhere,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, path: true, tags: true, updatedAt: true },
      })
    } catch {
      items = []
    }
  }

  const byGroup: Record<string, any[]> = {}
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => GROUPS.includes(t as any))
    const key = itsTags[0] || "Reference File"
    if (!byGroup[key]) byGroup[key] = []
    // filter reference items by scope tag if present
    if (key === "Reference File") {
      const needed = scope === "full" ? "refscope:full" : "refscope:open"
      if (Array.isArray(it.tags) && it.tags.includes(needed)) byGroup[key].push(it)
    } else {
      byGroup[key].push(it)
    }
  }

  const groupsOrder = group === 'All' ? ([...GROUPS] as const) : ([group] as any)

  return (
    <div className="space-y-4">
      <section className="max-w-5xl">
        {/* Groups first, no label */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            className={`tag-chip ${group==='All' ? 'bg-sky-100 border-sky-400 text-sky-900 hover:border-sky-400 hover:text-sky-900' : ''}`}
            href={`/integration?scope=${scope}`}
            prefetch={false}
          >
            All
          </Link>
          {GROUPS.map((g) => (
            <Link
              key={g}
              className={`tag-chip ${group===g ? 'bg-sky-100 border-sky-400 text-sky-900 hover:border-sky-400 hover:text-sky-900' : ''}`}
              href={`/integration?scope=${scope}&group=${encodeURIComponent(g)}`}
              prefetch={false}
            >
              {g === 'Index File' ? 'Index Files' : g === 'Reference File' ? 'Reference Files' : g}
            </Link>
          ))}
        </div>
        {/* Access level second, no label */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Link
            className={`tag-chip ${scope==='open' ? 'bg-amber-50 border-amber-300 text-amber-800' : ''}`}
            href={`/integration?scope=open&group=${encodeURIComponent(group)}`}
            prefetch={false}
          >
            Open Icecat
          </Link>
          <Link
            className={`tag-chip ${scope==='full' ? 'bg-amber-50 border-amber-300 text-amber-800' : ''}`}
            href={`/integration?scope=full&group=${encodeURIComponent(group)}`}
            prefetch={false}
          >
            Full Icecat
          </Link>
        </div>
      </section>

      {/* Column header once for all groups (align with Manuals) */}
      <section className="max-w-5xl">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-48" />
          </colgroup>
          <thead className="bg-neutral-50/80 text-neutral-600">
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
              <th className="py-2 px-3 text-left text-xs font-medium border-l border-[hsl(var(--border))]">Type</th>
              <th className="py-2 px-3 text-left text-xs font-medium border-l border-[hsl(var(--border))]">Format</th>
              <th className="py-2 px-3 text-right text-xs font-medium border-l border-[hsl(var(--border))]">Action</th>
            </tr>
          </thead>
        </table>
      </section>

      {groupsOrder.map((g) => (
        byGroup[g] && byGroup[g].length > 0 ? (
          <section key={g} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600 flex items-center gap-2">
              <span aria-hidden className="text-base leading-none">{emojiForGroup(g)}</span>
              <span>{displayGroupName(g)}</span>
            </div>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-48" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {g === 'Reference File'
                  ? pairReference(byGroup[g]).map((p) => (
                      <tr key={p.key} className="align-middle hover:bg-neutral-50">
                        <td className="py-2 px-3 text-xs font-normal text-neutral-900">
                          <DetailTitle title={p.title} openDesc={getDesc(p.open)} fullDesc={getDesc(p.full)} className="truncate" />
                        </td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">
                          {renderPairScope(p)}
                        </td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">
                          <code className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px]">{p.format}</code>
                        </td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-right">
                          <ActionButtons
                            links={[
                              ...(p.open ? [{ label: 'Open', href: p.open.path }] : []),
                              ...(p.full ? [{ label: 'Full', href: p.full.path }] : []),
                            ]}
                            openDesc={getDesc(p.open)}
                            fullDesc={getDesc(p.full)}
                            favicon={"https://www.google.com/s2/favicons?sz=32&domain=icecat.biz"}
                          />
                        </td>
                      </tr>
                    ))
                  : byGroup[g].map((m: any) => (
                      <tr key={m.id} className="align-middle hover:bg-neutral-50">
                        <td className="py-2 px-3 text-xs font-normal text-neutral-900">
                          <DetailTitle title={m.title} desc={getDesc(m)} className="truncate" />
                        </td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{renderScopeTags(m)}</td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">
                          <code className="px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px]">{fileFormat(m.path)}</code>
                        </td>
                        <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-right">
                          <ActionButtons links={[{ label: 'Link', href: m.path }]} desc={getDesc(m)} favicon={"https://www.google.com/s2/favicons?sz=32&domain=icecat.biz"} />
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

function hasTag(m: any, t: string) {
  try { return Array.isArray(m.tags) && m.tags.includes(t) } catch { return false }
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

function emojiForGroup(name: string): string {
  try {
    const n = String(name || '')
    if (/index/i.test(n)) return '🗂️'
    if (/reference/i.test(n)) return '🔖'
    const options = ['📄','📁','📑','🧭','🗃️','🗂️','📚','🔗']
    let h = 0
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
    return options[h % options.length]
  } catch { return '📄' }
}

function displayGroupName(name: string): string {
  try {
    if (name === 'Index File') return 'Index Files'
    if (name === 'Reference File') return 'Reference Files'
    return name
  } catch { return name }
}

function Dot({ color }: { color: 'green' | 'blue' }) {
  const cls = color === 'green' ? 'bg-emerald-500' : 'bg-sky-500'
  return <span aria-hidden className={`inline-block w-2 h-2 rounded-full ${cls}`}></span>
}

function renderPairScope(p: { open?: any; full?: any }) {
  if (p.open && p.full) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="green" />
        <Dot color="blue" />
        <span>For both</span>
      </span>
    )
  }
  if (p.open) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="green" />
        <span>Open Icecat</span>
      </span>
    )
  }
  if (p.full) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="blue" />
        <span>Full Icecat</span>
      </span>
    )
  }
  return '-'
}

function renderScopeTags(m: any) {
  const open = hasTag(m, 'refscope:open')
  const full = hasTag(m, 'refscope:full')
  if (open && full) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="green" />
        <Dot color="blue" />
        <span>For both</span>
      </span>
    )
  }
  if (open) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="green" />
        <span>Open Icecat</span>
      </span>
    )
  }
  if (full) {
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color="blue" />
        <span>Full Icecat</span>
      </span>
    )
  }
  return '-'
}

function pairReference(items: any[]) {
  const norm = (s: string) => (s || '').trim().toLowerCase()
  const fmt = (p?: string) => fileFormat(p || '')
  const map = new Map<string, { key: string; title: string; open?: any; full?: any; format: string }>()
  for (const it of items) {
    const key = norm(it.title)
    const entry = map.get(key) || { key, title: it.title, format: fmt(it.path) }
    if (hasTag(it, 'refscope:open')) entry.open = it
    if (hasTag(it, 'refscope:full')) entry.full = it
    // Prefer a non-empty format from either
    entry.format = entry.format || fmt(it.path)
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title))
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
