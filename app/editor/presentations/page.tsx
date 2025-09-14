import Link from "next/link";
import { prisma } from "@/lib/db";
import { createPresentation, updatePresentation, updatePresentationUseCase, deletePresentation } from "@/actions/presentations";
import ConfirmDelete from "@/components/ConfirmDelete";
import ToggleDetails from "@/components/ToggleDetails";
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls";

const TAGS = [
  "For Retailers",
  "For Brands",
  "Icecat Commerce",
  "Amazon",
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
            <label className="block text-sm mb-1">Tags</label>
            <div className="flex items-center gap-3 flex-wrap">
              {TAGS.map((t) => (
                <label key={t} className="text-sm"><input type="checkbox" name="tags" value={t} className="mr-2" /> {t}</label>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">Or upload attachment (optional)</label>
            <input name="file" type="file" className="w-full text-sm" />
            <p className="text-xs text-neutral-500 mt-1">If selected, the file will be uploaded and used instead of URL.</p>
          </div>
          <div>
            <span className="block text-sm mb-1">Audience</span>
            <div className="flex gap-3 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" name="audience" value="RETAILERS" defaultChecked /> For Retailers</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="audience" value="BRANDS" /> For Brands</label>
            </div>
          </div>
          <div className="flex items-center gap-2"><SubmitButton label="Add presentation" pendingLabel="Adding..." /><SaveStatus /></div>
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
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-40" />
              </colgroup>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {byGroup[group].map((p: any) => (
                  <>
                  <tr key={p.id} className="align-middle">
                    <td className="py-2 px-3 text-xs font-normal text-neutral-900">{p.title}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap text-neutral-700">{p.path?.startsWith('/uploads/') ? 'Attachment' : 'Link'}</td>
                    <td className="py-2 px-3 border-l border-[hsl(var(--border))] whitespace-nowrap">
                      <div className="flex items-center gap-2 justify-end whitespace-nowrap overflow-x-auto">
                        {p.path?.startsWith('/uploads/') ? (
                          <span className="space-x-3">
                            <a className="underline font-medium" href={p.path} target="_blank" rel="noreferrer">Preview</a>
                            <a className="underline text-neutral-700" href={p.path} download>Download</a>
                          </span>
                        ) : (
                          <a className="underline font-medium" href={p.path} target="_blank" rel="noreferrer">Open</a>
                        )}
                        <ToggleDetails targetId={`edit-${p.id}`} />
                        <form action={async () => { 'use server'; await deletePresentation(p.id) }}>
                          <ConfirmDelete />
                        </form>
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
                      </div>
                    </td>
                  </tr>
                  <tr>
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
                            <div>
                              <label className="block text-sm mb-1">Use Case</label>
                              <select name="usecase" defaultValue={(p.tags||[]).find((t:string)=>t.startsWith('usecase:'))?.slice('usecase:'.length) || ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
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
                              <input name="usecase_new" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" placeholder="e.g. Integrations" />
                            </div>
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
                  </>
                ))}
              </tbody>
            </table>
          </section>
        ) : null
      ))}
    </div>
  );
}
