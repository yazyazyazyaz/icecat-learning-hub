import Link from "next/link"
import { db } from "@/lib/db"
import ActionButtons from "@/components/ActionButtons"

export const revalidate = 60

// Preferred order of groups shown on the page
const DEFAULT_USE_CASES = [
  "APIs",
  "Product Story",
  "Icecat Commerce",
  "Brand Cloud",
  "Sustainability",
  "Various",
] as const

type Manual = { id: string; title: string; path: string; tags?: string[]; _uc?: string }

export default async function ManualsPage({ searchParams }: { searchParams?: { uc?: string } }) {
  const uc = (searchParams?.uc || "").toString()

  // Fetch only the fields that exist in DB
  let itemsRaw: Manual[] = []
  try {
    itemsRaw = (await db.upload.findMany({
      where: { kind: "DOCUMENT" as any, tags: { has: "manual" } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, path: true, tags: true },
    })) as any
  } catch (e) {
    console.error("ManualsPage: DB unavailable", e)
    itemsRaw = []
  }

  // Derive use case from tags; drop legacy "Reference files"
  const toUC = (m: Manual) => {
    const tag = (m.tags || []).find((t) => typeof t === "string" && t.startsWith("usecase:"))
    const val = tag ? tag.slice("usecase:".length) : ""
    return val === "Reference files" ? "" : val
  }
  const items = itemsRaw.map((m) => ({ ...m, _uc: toUC(m) }))

  const dynamicUC = Array.from(new Set(items.map((x) => x._uc || "").filter((v) => v)))
  const useCases = Array.from(new Set<string>([...DEFAULT_USE_CASES, ...dynamicUC]))

  const filtered = uc ? items.filter((m) => m._uc === uc) : items

  const groupsOrder = uc ? [uc] : [...useCases, "Uncategorized"]
  const byGroup: Record<string, Manual[]> = {}
  for (const it of filtered) {
    const key = it._uc || "Uncategorized"
    if (!byGroup[key]) byGroup[key] = []
    byGroup[key].push(it)
  }

  return (
    <div className="grid gap-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <Link className={`tag-chip ${!uc ? 'bg-sky-100 border-sky-400 text-sky-900' : ''}`} href={`/manuals`}>
          All
        </Link>
        {useCases.map((c) => (
          <Link key={c} className={`tag-chip ${uc === c ? 'bg-sky-100 border-sky-400 text-sky-900' : ''}`} href={`/manuals?uc=${encodeURIComponent(c)}`}>
            {c}
          </Link>
        ))}
      </div>

      {/* Header */}
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

      {/* Groups */}
      {groupsOrder.map((group) =>
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden max-w-5xl">
            <div className="px-3 py-2 bg-neutral-100 text-xs font-medium text-neutral-600 flex items-center gap-2">
              <span aria-hidden className="text-base leading-none">{emojiForUseCase(group)}</span>
              <span>{group}</span>
            </div>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((m) => (
                  <tr key={m.id} className="align-middle">
                    <td className="py-2 px-3 text-xs font-normal text-neutral-900">{m.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">
                      {m.path?.startsWith("/uploads/") ? "Attachment" : "Link"}
                    </td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-right">
                      {m.path?.startsWith("/uploads/") ? (
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
      )}
    </div>
  )
}

// ActionButtons handles favicons for external links; attachments show none

function emojiForUseCase(uc: string): string {
  switch (uc) {
    case 'APIs': return '🧩'
    case 'Product Story': return '📄'
    case 'Icecat Commerce': return '🛒'
    case 'Brand Cloud': return '☁️'
    case 'Sustainability': return '🍃'
    case 'Various': return '🔹'
    case 'Social Media': return '💬'
    default: return '🔹'
  }
}
