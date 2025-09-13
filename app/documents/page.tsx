import Link from "next/link"
import { db } from "@/lib/db"

const DOC_TAGS = [
  'Contracts',
  'Various documents',
] as const

export default async function DocumentsPage({ searchParams }: { searchParams?: { tag?: string } }) {
  const tag = (searchParams?.tag || '').toString()
  const where: any = tag ? { tags: { has: tag } } : {}
  // Exclude Integration Files (shown under /integration)
  where.NOT = [
    { tags: { has: 'Index File' } },
    { tags: { has: 'Reference File' } },
  ]
  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { title: 'asc' } })
  } catch (e) {
    try {
      // Fallback to legacy Upload model if migration not applied (exclude manuals)
      const legacyWhere: any = { kind: 'DOCUMENT', NOT: { tags: { has: 'manual' } } }
      if (tag) legacyWhere.tags = { has: tag }
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { title: 'asc' } })
    } catch (e2) {
      console.error('DocumentsPage: DB unavailable', e2)
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

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <Link className={`tag-chip ${!tag? 'tag-chip--active':''}`} href={`/documents`}>All</Link>
        {DOC_TAGS.map((t) => (
          <Link key={t} className={`tag-chip ${tag===t? 'tag-chip--active':''}`} href={`/documents?tag=${encodeURIComponent(t)}`}>{t}</Link>
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

      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600">{group}</div>
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
