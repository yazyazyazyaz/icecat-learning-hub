import Link from "next/link"
import { db } from "@/lib/db"

const DEFAULT_USE_CASES = [
  'APIs',
  'Reference files',
  'Social Media',
  'Icecat Commerce',
  'Various',
] as const

export default async function ManualsPage({ searchParams }: { searchParams?: { uc?: string } }) {
  const uc = (searchParams?.uc || '').toString()
  const where: any = { kind: 'DOCUMENT', tags: { has: 'manual' } }
  let itemsRaw: any[] = []
  try {
    itemsRaw = await db.upload.findMany({ where, orderBy: { title: 'asc' }, select: { id:true, title:true, path:true, tags:true } as any })
  } catch (e) {
    console.error('ManualsPage: DB unavailable', e)
    itemsRaw = []
  }
  const normalizeUC = (m: any) => ((m.tags || []).find((t: string) => t.startsWith('usecase:'))?.slice('usecase:'.length) ?? '')
  const items = itemsRaw.map((m) => ({ ...m, _uc: normalizeUC(m) }))
  const dynamicUC = Array.from(new Set(items.map((a: any) => a._uc).filter(Boolean)))
  const useCases = Array.from(new Set<string>([...DEFAULT_USE_CASES, ...dynamicUC]))
  const filtered = uc ? items.filter((m: any) => m._uc === uc) : items

  const groupsOrder = uc ? [uc] : [...useCases, 'Uncategorized']
  const byGroup: Record<string, any[]> = {}
  for (const it of filtered) {
    const key = it._uc || 'Uncategorized'
    if (!byGroup[key]) byGroup[key] = []
    byGroup[key].push(it)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <Link className={`tag-chip ${!uc? 'tag-chip--active':''}`} href={`/manuals`}>All</Link>
        {useCases.map((c) => (
          <Link key={c} className={`tag-chip ${uc===c? 'tag-chip--active':''}`} href={`/manuals?uc=${encodeURIComponent(c)}`}>{c}</Link>
        ))}
      </div>
      {/* Column header once for all groups */}
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

      {/* Separate cards per group for strong visual separation */}
      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600">
              {group}
            </div>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m: any) => (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-sm font-normal text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{m.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      {m.path?.startsWith('/uploads/') ? (
                        <a className="underline font-medium" href={m.path} target="_blank" rel="noreferrer">Preview</a>
                      ) : (
                        <a className="underline font-medium" href={m.path} target="_blank" rel="noreferrer">Open</a>
                      )}
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
