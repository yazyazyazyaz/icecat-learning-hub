import Link from "next/link";
import { prisma } from "@/lib/db";

const TAGS = [
  "For Retailers",
  "For Brands",
  "Icecat Commerce",
  "Amazon",
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
        <Link className={`tag-chip ${!tag? 'tag-chip--active':''}`} href={`/presentations`}>All</Link>
        {TAGS.map((t) => (
          <Link key={t} className={`tag-chip ${tag===t? 'tag-chip--active':''}`} href={`/presentations?tag=${encodeURIComponent(t)}`}>{t}</Link>
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
                {byGroup[group].map((p: any) => (
                  <tr key={p.id} className="align-middle">
                    <td className="py-2 px-3 text-sm font-normal text-neutral-900">{p.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{p.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      {p.path?.startsWith('/uploads/') ? (
                        <a className="underline font-medium" href={p.path} target="_blank" rel="noreferrer">Preview</a>
                      ) : (
                        <a className="underline font-medium" href={p.path} target="_blank" rel="noreferrer">Open</a>
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
