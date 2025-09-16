import Link from "next/link"
import { db } from "@/lib/db"
import ActionButtons from "@/components/ActionButtons"
import { isAttachmentPath } from "@/lib/uploads"

const DOC_TAGS = [
  'Contracts',
  'Various documents',
  'Internal documents',
] as const

export default async function DocumentsPage({ searchParams }: { searchParams?: { tag?: string } }) {
  const tag = (searchParams?.tag || '').toString()
  const notIntegration = { OR: [ { tags: { has: 'Index File' } }, { tags: { has: 'Reference File' } } ] }
  const where: any = tag ? { AND: [ { tags: { has: tag } }, { NOT: notIntegration } ] } : { NOT: notIntegration }
  let items: any[] = []
  try {
    items = await (db as any).documentFile.findMany({ where, orderBy: { title: 'asc' } })
  } catch (e) {
    try {
      // Fallback to legacy Upload model if migration not applied (exclude manuals and integration)
      const legacyWhere: any = {
        kind: 'DOCUMENT',
        AND: [
          { NOT: { tags: { has: 'manual' } } },
          { NOT: { OR: [ { tags: { has: 'Index File' } }, { tags: { has: 'Reference File' } } ] } },
        ],
      }
      if (tag) legacyWhere.AND.push({ tags: { has: tag } })
      items = await db.upload.findMany({ where: legacyWhere, orderBy: { title: 'asc' } })
    } catch (e2) {
      console.error('DocumentsPage: DB unavailable', e2)
      items = []
    }
  }

  // Deduplicate items by normalized path (ignoring query/hash) or by normalized title if no path
  function normalizePath(p: string): string {
    try {
      const u = new URL(p, 'https://example.com')
      // If relative path, base URL above will be used but we only care about pathname
      const isAbsolute = /^https?:\/\//i.test(p)
      const key = (isAbsolute ? (u.host + u.pathname) : u.pathname).toLowerCase().replace(/\/+$/, '')
      return key || p.toLowerCase()
    } catch { return (p || '').toLowerCase() }
  }
  function normalizeTitle(t: string): string { return (t || '').trim().toLowerCase() }
  const byKey = new Map<string, any>()
  for (const it of items) {
    const key = (it.path ? normalizePath(String(it.path)) : '') || normalizeTitle(String(it.title))
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, it)
    } else {
      // Keep the most recent by updatedAt
      try {
        const a = new Date(it.updatedAt as any).getTime() || 0
        const b = new Date(prev.updatedAt as any).getTime() || 0
        if (a >= b) byKey.set(key, it)
      } catch { /* ignore */ }
    }
  }
  items = Array.from(byKey.values())

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
        <Link className={`tag-chip ${!tag? 'bg-sky-100 border-sky-400 text-sky-900':''}`} href={`/documents`}>All</Link>
        {DOC_TAGS.map((t) => (
          <Link key={t} className={`tag-chip ${tag===t? 'bg-sky-100 border-sky-400 text-sky-900':''}`} href={`/documents?tag=${encodeURIComponent(t)}`}>{t}</Link>
        ))}
      </div>

      <section className="max-w-5xl">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-40" />
          </colgroup>
          <thead className="bg-neutral-50/80 text-neutral-600">
            <tr>
              <th className="py-2 px-3 text-left text-xs font-medium">Title</th>
              <th className="py-2 px-3 text-left text-xs font-medium border-l border-[hsl(var(--border))]">Type</th>
              <th className="py-2 px-3 text-right text-xs font-medium border-l border-[hsl(var(--border))]">Action</th>
            </tr>
          </thead>
        </table>
      </section>

      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600 flex items-center gap-2">
              <span aria-hidden className="text-base leading-none">{emojiForDocTag(group)}</span>
              <span>{group}</span>
            </div>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m: any) => (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-xs font-normal text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{isAttachmentPath(m.path) ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-right">
                      {isAttachmentPath(m.path) ? (
                        <ActionButtons links={[{ label: 'Preview', href: m.path }]} labelMode="label" />
                      ) : (
                        <ActionButtons links={[{ label: 'Open', href: m.path }]} labelMode="label" />
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

function emojiForDocTag(tag: string): string {
  switch (tag) {
    case 'Contracts': return '🧾'
    case 'Various documents': return '🗂️'
    case 'Internal documents': return '🏢'
    default: return '📄'
  }
}

// ActionButtons handles favicons for external links; attachments show none
