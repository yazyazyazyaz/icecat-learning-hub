import Link from "next/link"
import { db } from "@/lib/db"
import LinkActions from "@/components/LinkActions"

const GROUPS = ['Index File','Reference File'] as const

export default async function IntegrationFilesPage({ searchParams }: { searchParams?: { group?: string; scope?: string } }) {
  const group = (searchParams?.group || '').toString()
  const rawScope = (searchParams?.scope || '').toString().toLowerCase()
  const scope = rawScope || 'open'
  const where: any = {}
  if (group && GROUPS.includes(group as any)) where.tags = { has: group }
  if (scope === 'open') where.tags = { hasEvery: ['Reference File','refscope:open'] }
  if (scope === 'full') where.tags = { hasEvery: ['Reference File','refscope:full'] }

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
        <Link className={`tag-chip ${scope==='open'? 'tag-chip--active':''}`} href={`/integration?scope=open`}>Open Icecat</Link>
        <Link className={`tag-chip ${scope==='full'? 'tag-chip--active':''}`} href={`/integration?scope=full`}>Full Icecat</Link>
        <span className="ml-3 text-xs text-neutral-500">Groups:</span>
        {GROUPS.map((g) => (
          <Link key={g} className={`tag-chip ${group===g? 'tag-chip--active':''}`} href={`/integration?scope=${scope}&group=${encodeURIComponent(g)}`}>{g}</Link>
        ))}
      </div>

      <section className="max-w-5xl">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-40" />
          </colgroup>
          <thead className="bg-neutral-50/80 text-neutral-600">
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
              <th className="py-2 px-3 text-left text-xs font-medium border-l border-[hsl(var(--border))]">Type</th>
              <th className="py-2 px-3 text-left text-xs font-medium border-l border-[hsl(var(--border))]">Link</th>
            </tr>
          </thead>
        </table>
      </section>

      {groupsOrder.map((g) => (
        byGroup[g] && byGroup[g].length > 0 ? (
          <section key={g} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600">{g}</div>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[g].map((m: any) => (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-sm font-normal text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border" aria-label="Access level">
                        <span className={`h-2 w-2 rounded-full ${hasTag(m,'refscope:open') ? 'bg-emerald-600' : hasTag(m,'refscope:full') ? 'bg-sky-600' : 'bg-neutral-400'}`}></span>
                        {hasTag(m,'refscope:open') ? 'Open Icecat' : hasTag(m,'refscope:full') ? 'Full Icecat' : '—'}
                      </span>
                      {fileType(m.path)}
                    </td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      <LinkActions href={m.path} />
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
