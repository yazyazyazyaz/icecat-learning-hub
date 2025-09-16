import Link from "next/link";
import { Fragment } from "react";
import { prisma } from "@/lib/db";
import { createPresentation, updatePresentation, updatePresentationUseCase, deletePresentation } from "@/actions/presentations";
import ConfirmDelete from "@/components/ConfirmDelete";
import ToggleDetails from "@/components/ToggleDetails";
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls";
import { extractFileName, guessMimeFromData, isAttachmentPath } from "@/lib/uploads";

const TAGS = [
  "For Retailers",
  "For Brands",
  "Icecat Commerce",
  "Amazon",
  "Product Stories",
  "Sustainability",
  "Various",
] as const;

export default async function EditorPresentationsPage({ searchParams }: { searchParams?: { tag?: string; edit?: string } }) {
  const tag = (searchParams?.tag || '').toString();
  const editId = (searchParams?.edit || '').toString();
  const where: any = tag ? { tags: { has: tag } } : {};
  let items: any[] = []
  try {
    items = await prisma.presentation.findMany({ where, orderBy: { updatedAt: 'desc' } });
  } catch (e) {
    console.error('EditorPresentationsPage: DB unavailable', e)
    items = []
  }

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

  const editing = editId ? await prisma.presentation.findUnique({ where: { id: editId } }) : null as any;

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-medium">Add new</h2>
        <form action={async (fd: FormData)=>{ 'use server'; await createPresentation(fd) }} className="grid gap-3 md:grid-cols-6 items-end mt-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">URL (leave empty if uploading attachment)</label>
            <input name="path" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
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
          {/* Audience removed */}
          <div className="flex items-center gap-2"><SubmitButton label="Add presentation" pendingLabel="Adding..." className="bg-violet-500 text-white hover:bg-violet-600 border-violet-600" /><SaveStatus /></div>
        </form>
      </section>
      <div className="flex items-center gap-2 flex-wrap max-w-5xl">
        <Link className={`tag-chip ${!tag? 'tag-chip--active':''}`} href={`/editor/presentations`}>All</Link>
        {TAGS.map((t) => (
          <Link key={t} className={`tag-chip ${tag===t? 'tag-chip--active':''}`} href={`/editor/presentations?tag=${encodeURIComponent(t)}`}>{t}</Link>
        ))}
      </div>

      <section className="max-w-5xl">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-[320px]" />
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
            <div className="px-3 py-2 border-b bg-neutral-100 text-[11px] uppercase tracking-wide text-neutral-700">{group}</div>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-[320px]" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((p: any) => (
                  <Fragment key={p.id}>
                  <tr key={p.id} className="align-middle">
                    <td className="py-2 px-3 text-xs font-normal text-neutral-900">{p.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{isAttachmentPath(p.path) ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))]">
                      <div className="flex items-center gap-2 justify-end">
                        <ToggleDetails targetId={`edit-${p.id}`} />
                        <form action={async () => { 'use server'; await deletePresentation(p.id) }}>
                          <ConfirmDelete />
                        </form>
                      </div>
                    </td>
                  </tr>
                  <tr key={`edit-${p.id}-details`}>
                    <td colSpan={3} className="bg-neutral-50">
                      <details id={`edit-${p.id}`} open={editId === p.id}>
                        <summary className="hidden">Edit</summary>
                        <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                          <form action={async (fd: FormData)=>{ 'use server'; await updatePresentation(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                            <input type="hidden" name="id" defaultValue={p.id} />
                            <div className="md:col-span-2">
                              <label className="block text-sm mb-1">Title</label>
                              <input name="title" defaultValue={p.title} required className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm mb-1">URL (leave empty if uploading attachment)</label>
                              <input name="path" defaultValue={p.path} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://..." />
                            </div>
                              <div className="md:col-span-6">
                                <label className="block text-sm mb-1">Tag</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {TAGS.map((t) => (
                                    <label key={t} className="text-sm"><input type="radio" name="tag" value={t} className="mr-2" defaultChecked={p.tags?.includes(t)} /> {t}</label>
                                  ))}
                                </div>
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-sm mb-1">Or upload attachment (optional)</label>
                                <input name="file" type="file" className="w-full text-sm bg-white" />
                                <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
                              </div>
                              {/* Audience removed */}
                            <div className="flex items-center gap-2">
                              <SubmitButton label="Update" pendingLabel="Updating..." className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700" />
                              <SaveStatus />
                              <Link href={`/editor/presentations${tag?`?tag=${encodeURIComponent(tag)}`:''}`} className="px-3 py-1 rounded-full border text-xs">Cancel</Link>
                            </div>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                  </Fragment>
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
function faviconForTag(tag: string): string | null {
  const map: Record<string,string> = {
    'For Retailers': 'shopify.com',
    'For Brands': 'interbrand.com',
    'Icecat Commerce': 'icecat.biz',
    'Amazon': 'amazon.com',
    'Product Stories': 'medium.com',
    'Sustainability': 'wwf.org',
    'Various': 'wikipedia.org',
  }
  const domain = map[tag]
  return domain ? `https://www.google.com/s2/favicons?sz=32&domain=${domain}` : null
}
function fileFormat(path: string) {
  try {
    if (path?.startsWith('data:')) {
      const name = extractFileName(path)
      if (name) {
        const ext = (name.split('.').pop() || '').toUpperCase()
        if (ext) return ext
      }
      const mime = guessMimeFromData(path)
      if (mime) return mime.split('/').pop()?.toUpperCase() || 'DATA'
      return 'DATA'
    }
    const name = (path || '').split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const ext = (noGz.split('.').pop() || '').toUpperCase()
    return ext || '-'
  } catch { return '-' }
}
