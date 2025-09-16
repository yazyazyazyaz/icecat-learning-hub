import Link from "next/link";
import { prisma } from "@/lib/db";
import { deletePresentation } from "@/actions/presentations";
import SearchBox from "@/components/admin/SearchBox";
import EditPresentationButton from "@/components/admin/EditPresentationButton";
import { createPresentation, updatePresentation, updatePresentationUseCase } from "@/actions/presentations";
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls";
import { isAttachmentPath } from "@/lib/uploads";

const TAGS = [
  "For Retailers",
  "For Brands",
  "Icecat Commerce",
  "Amazon",
  "Product Stories",
  "Sustainability",
  "Various",
] as const;

export default async function AdminPresentations({
  searchParams,
}: { searchParams?: { q?: string; tag?: string; edit?: string } }) {
  const q = (searchParams?.q ?? "").toString();
  const tag = (searchParams?.tag ?? "").toString();
  const editId = (searchParams?.edit ?? "").toString();

  const where: any = {
    AND: [
      tag ? { tags: { has: tag } } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { path: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const items = await prisma.presentation.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
  });

  // Group by tag (similar to Manuals by use-case)
  const groupsOrder = tag ? [tag] : [...TAGS, "Uncategorized"];
  const byGroup: Record<string, any[]> = {};
  for (const it of items) {
    const itsTags: string[] = (it.tags || []).filter((t: string) => TAGS.includes(t as any));
    if (itsTags.length === 0) {
      if (!byGroup["Uncategorized"]) byGroup["Uncategorized"] = [];
      byGroup["Uncategorized"].push(it);
    } else {
      for (const t of itsTags) {
        if (!byGroup[t]) byGroup[t] = [];
        byGroup[t].push(it);
      }
    }
  }

  const editing = editId ? await prisma.presentation.findUnique({ where: { id: editId } }) : null as any;

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Presentations</h1>
            <p className="text-sm text-gray-600 mt-1">Create and manage decks with tags and use cases.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Link className={`tag-chip ${!tag? 'tag-chip--active':''}`} href={`/admin/presentations`}>All</Link>
            {TAGS.map((t) => (
              <Link key={t} className={`tag-chip ${tag===t? 'tag-chip--active':''}`} href={`/admin/presentations?tag=${encodeURIComponent(t)}`}>{t}</Link>
            ))}
          </div>
          <SearchBox />
        </div>
        {editing && (
          <form action={async (fd: FormData)=>{ 'use server'; await updatePresentation(fd) }} className="grid gap-3 md:grid-cols-6 items-end mt-4">
            <input type="hidden" name="id" defaultValue={editing.id} />
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Title</label>
              <input name="title" defaultValue={editing.title} required className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">URL (leave empty if uploading attachment)</label>
              <input name="path" defaultValue={editing.path} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm mb-1">Use Case</label>
              <select name="usecase" defaultValue={(editing.tags||[]).find((t:string)=>t.startsWith('usecase:'))?.slice('usecase:'.length) || ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
                <option value="">(none)</option>
                <option value="APIs">APIs</option>
                <option value="Reference files">Reference files</option>
                <option value="Social Media">Social Media</option>
                <option value="Icecat Commerce">Icecat Commerce</option>
                <option value="Various">Various</option>
                <option value="custom">Custom.</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Custom Use Case (optional)</label>
              <input name="usecase_new" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Integrations" />
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm mb-1">Tag</label>
              <div className="flex items-center gap-3 flex-wrap">
                {TAGS.map((t) => (
                  <label key={t} className="text-sm"><input type="radio" name="tag" value={t} className="mr-2" defaultChecked={editing.tags?.includes(t)} /> {t}</label>
                ))}
              </div>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Or upload attachment (optional)</label>
              <input name="file" type="file" className="w-full text-sm" />
              <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
            </div>
            {/* Audience removed from edit */}
            <div className="flex items-center gap-2"><SubmitButton label="Update presentation" pendingLabel="Updating..." /><SaveStatus /></div>
          </form>
        )}
        <form action={async (fd: FormData)=>{ 'use server'; await createPresentation(fd) }} className="grid gap-3 md:grid-cols-6 items-end mt-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Platform Overview" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">URL (leave empty if uploading attachment)</label>
            <input name="path" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="/files/presentations/platform-overview.pdf" />
          </div>
          <div>
            <label className="block text-sm mb-1">Use Case</label>
            <select name="usecase" className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
              <option value="APIs">APIs</option>
              <option value="Reference files">Reference files</option>
              <option value="Social Media">Social Media</option>
              <option value="Icecat Commerce">Icecat Commerce</option>
              <option value="Various">Various</option>
              <option value="custom">Custom.</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Custom Use Case (optional)</label>
            <input name="usecase_new" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Integrations" />
          </div>
            <div className="md:col-span-6">
              <label className="block text-sm mb-1">Tag</label>
              <div className="flex items-center gap-3 flex-wrap">
                {TAGS.map((t) => (
                  <label key={t} className="text-sm"><input type="radio" name="tag" value={t} className="mr-2" /> {t}</label>
                ))}
              </div>
            </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
            {/* Audience removed from add */}
          <div className="flex items-center gap-2"><SubmitButton label="Add presentation" pendingLabel="Adding..." /><SaveStatus /></div>
        </form>
      </section>
      {groupsOrder.map((group) => (
        byGroup[group] && byGroup[group].length > 0 ? (
          <section key={group} className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{group}</div>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 bg-gray-50">
                <tr>
                  <th className="py-2 px-4">Title</th>
                  <th className="py-2 px-4">Type</th>
                  <th className="py-2 px-4">Path</th>
                  <th className="py-2 px-4">Updated</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {byGroup[group].map((p) => (
                  <tr key={p.id} className="border-t align-top">
                    <td className="py-2 px-4">{p.title}</td>
                    <td className="py-2 px-4 whitespace-nowrap text-neutral-700">{isAttachmentPath(p.path) ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-4 text-gray-700 truncate max-w-[360px]">
                      <a className="underline font-medium" href={p.path} target="_blank" rel="noreferrer">{isAttachmentPath(p.path) ? 'Preview' : 'Open'}</a>
                    </td>
                    <td className="py-2 px-4 text-gray-600">{p.updatedAt.toISOString().slice(0,10)}</td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2 justify-end">
                        <form action={async (fd: FormData)=>{ 'use server'; await updatePresentationUseCase(fd) }} className="flex items-center gap-2">
                          <input type="hidden" name="id" defaultValue={p.id} />
                          <select name="usecase" defaultValue={(p.tags||[]).find((t:string)=>t.startsWith('usecase:'))?.slice('usecase:'.length) || ''} className="rounded-xl border px-2 py-1 text-xs bg-white">
                            <option value="">(none)</option>
                            <option value="APIs">APIs</option>
                            <option value="Reference files">Reference files</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Icecat Commerce">Icecat Commerce</option>
                            <option value="Various">Various</option>
                            <option value="custom">Custom.</option>
                          </select>
                          <input name="usecase_new" placeholder="Custom" className="rounded-xl border px-2 py-1 text-xs" />
                          <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-2 py-1" />
                          <SaveStatus />
                        </form>
                        <Link href={`/admin/presentations?${tag?`tag=${encodeURIComponent(tag)}&`:''}edit=${p.id}`} className="px-3 py-1.5 rounded-full border">Edit</Link>
                        <form action={async () => { "use server"; await deletePresentation(p.id); }}>
                          <button className="px-3 py-1.5 rounded-full border hover:bg-red-50">Delete</button>
                        </form>
                      </div>
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
