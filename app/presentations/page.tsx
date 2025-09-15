import Link from "next/link";
import { prisma } from "@/lib/db";
import ActionButtons from "@/components/ActionButtons";

const TAGS = [
  "For Retailers",
  "For Brands",
  "Icecat Commerce",
  "Amazon",
  "Product Stories",
  "Sustainability",
  "Various",
] as const;

export default async function PresentationsPage({
  searchParams,
}: { searchParams?: { tag?: string } }) {
  const tag = (searchParams?.tag || '').toString();
  const where: any = tag ? { tags: { has: tag } } : {};
  let items: any[] = []
  try {
    items = await prisma.presentation.findMany({ where, orderBy: { title: 'asc' } });
  } catch (e) {
    console.error('PresentationsPage: DB unavailable', e)
    items = []
  }

  // Group by tag similar to Manuals
  const groupsOrder = tag ? [tag] : [...TAGS, 'Uncategorized'];
  const byGroup: Record<string, any[]> = {};
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => TAGS.includes(t as any));
    if (itsTags.length === 0) {
      if (!byGroup['Uncategorized']) byGroup['Uncategorized'] = [];
      byGroup['Uncategorized'].push(it);
    } else {
      for (const t of itsTags) {
        if (!byGroup[t]) byGroup[t] = [];
        byGroup[t].push(it);
      }
    }
  }

  return (
    <div className="grid gap-4">
        <div className="flex items-center gap-2 flex-wrap max-w-5xl">
          <Link className={`tag-chip ${!tag? 'bg-sky-100 border-sky-400 text-sky-900':''}`} href={`/presentations`}>All</Link>
        {TAGS.map((t) => (
          <Link key={t} className={`tag-chip ${tag===t? 'bg-sky-100 border-sky-400 text-sky-900':''}`} href={`/presentations?tag=${encodeURIComponent(t)}`}>{t}</Link>
        ))}
      </div>

      {/* Column header once for all groups */}
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
                {TAGS.includes(group as any) ? (<span aria-hidden className="text-base leading-none">{emojiForTag(group)}</span>) : null}
                <span>{group}</span>
              </div>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((p: any) => (
                  <tr key={p.id} className="align-middle">
                    <td className="py-2 px-3 text-xs font-normal text-neutral-900">{p.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{p.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-right">
                      {p.path?.startsWith('/uploads/') ? (
                        <ActionButtons links={[{ label: 'Preview', href: p.path }]} labelMode="label" />
                      ) : (
                        <ActionButtons links={[{ label: 'Open', href: p.path }]} labelMode="label" />
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
  );
}
function emojiForTag(tag: string): string {
  switch (tag) {
    case 'For Retailers': return '🛍️'
    case 'For Brands': return '🏷️'
    case 'Icecat Commerce': return '🛒'
    case 'Amazon': return '📦'
    case 'Product Stories': return '📚'
    case 'Sustainability': return '🌿'
    case 'Various': return '🧩'
    default: return '📄'
  }
}

// ActionButtons handles favicons for external links; attachments show none
