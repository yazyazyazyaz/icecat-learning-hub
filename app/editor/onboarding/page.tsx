import { db } from "@/lib/db"
import { createLearningPath, deleteLearningPath, addLearningTask, deleteLearningTask, moveLearningPath, updateLearningPath, updateLearningTask, addLearningTaskAttachment } from "@/actions/learningPaths"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"
import ToggleDetails from "@/components/ToggleDetails"
import ConfirmDelete from "@/components/ConfirmDelete"

export default async function EditorOnboardingPage() {
  // Fetch weeks for the Add Training selector
  let weeks: any[] = []
  try {
    weeks = await (db as any).learningPath.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }], select: { id: true, title: true } })
  } catch {
    weeks = await (db as any).$queryRawUnsafe(`SELECT id,title FROM "LearningPath" ORDER BY "sortOrder" ASC, "title" ASC`)
  }

  return (
    <div className="grid gap-6">
      {/* Add Training (simple) + Add Week (minimal) */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium">Onboarding — Trainings</h2>
          <ToggleDetails targetId="add-training" label="Add Training" className="px-3 py-1 rounded-full border text-xs" />
        </div>
        <details id="add-training" className="mt-3">
          <summary className="hidden">Add training</summary>
          <div className="p-3 rounded-lg border bg-neutral-50">
            <form action={async (fd: FormData)=>{ 'use server'; await addLearningTask(fd) }} encType="multipart/form-data" className="grid gap-3 md:grid-cols-6 items-end">
              <div>
                <label className="block text-sm mb-1">Week</label>
                <select name="pathId" className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
                  {weeks.map(w => (<option key={w.id} value={w.id}>{w.title}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Training #</label>
                <input name="day" type="number" min={1} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="1" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Title</label>
                <input name="title" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Kick-off & Setup" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Program</label>
                <textarea name="programMd" rows={8} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="- Morning: ...&#10;- Afternoon: ..."></textarea>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Description (optional)</label>
                <textarea name="noteMd" rows={8} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Notes, extra details..."></textarea>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Attachment (link)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input name="att_name" className="w-40 rounded-xl border px-3 py-2 text-sm" placeholder="Name" />
                  <input name="att_url" className="flex-1 rounded-xl border px-3 py-2 text-sm" placeholder="https://..." />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm mb-1">Attachment (upload)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input name="att_file_name" className="w-40 rounded-xl border px-3 py-2 text-sm" placeholder="Name" />
                  <input name="att_file" type="file" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SubmitButton label="Add Training" pendingLabel="Adding..." />
                <SaveStatus />
                <ToggleDetails targetId="add-training" label="Cancel" className="px-2 py-1 rounded-full border text-xs" />
              </div>
            </form>
          </div>
        </details>

        {/* Add Week form removed per request — trainings only */}
      </section>

      {/* Trainings list (flat) */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm">
        <AllTrainingsEditor />
      </section>
    </div>
  )
}

async function WeeksEditor() {
  const client: any = (await import('@/lib/db')).prisma as any
  let paths: any[] = []
  try {
    const pathRows: any[] = await client.$queryRawUnsafe(`SELECT "id","slug","title","sortOrder" FROM "LearningPath" ORDER BY "sortOrder" ASC, "title" ASC`)
    const taskRows: any[] = await client.$queryRawUnsafe(`SELECT * FROM "LearningTask" ORDER BY COALESCE("day", 9999) ASC, "position" ASC`)
    const byPath = new Map<string, any[]>()
    for (const t of taskRows) {
      const pid = String(t.pathId)
      if (!byPath.has(pid)) byPath.set(pid, [])
      byPath.get(pid)!.push(t)
    }
    paths = pathRows.map((p: any) => ({ ...p, tasks: byPath.get(String(p.id)) || [] }))
  } catch {
    paths = []
  }
  if (!paths.length) return <div className="mt-4 text-sm text-neutral-600">No weeks yet.</div>
  return (
    <div className="mt-6 grid gap-4">
      {paths.map((p) => (
        <section key={p.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">{p.title}</h3>
              <div className="text-xs text-neutral-600">Slug: {p.slug} • Order: {p.sortOrder}</div>
            </div>
            <form action={async ()=>{ 'use server'; await deleteLearningPath(p.id) }}>
              <ConfirmDelete
                className="px-2 py-1 rounded-full border text-xs"
                prompt="Delete this week?"
                yesLabel="Delete"
              />
            </form>
          </div>

          {/* Week reorder controls */}
          <div className="mt-3 flex items-center gap-2">
            <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', p.id); fd.append('dir','up'); await moveLearningPath(fd) }}>
              <button className="px-2 py-1 rounded-full border text-xs">Move up</button>
            </form>
            <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', p.id); fd.append('dir','down'); await moveLearningPath(fd) }}>
              <button className="px-2 py-1 rounded-full border text-xs">Move down</button>
            </form>
          </div>

          {/* Week inline edit */}
          <div className="mt-2">
            <ToggleDetails targetId={`edit-week-${p.id}`} label="Edit week" className="px-2 py-1 rounded-full border text-xs" />
          </div>
          <details id={`edit-week-${p.id}`} className="mt-2">
            <summary className="hidden">Edit week</summary>
            <div className="p-3 rounded-lg border bg-neutral-50">
              <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', p.id); await updateLearningPath(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Title</label>
                  <input name="title" defaultValue={p.title} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Slug</label>
                  <input name="slug" defaultValue={p.slug} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm mb-1">Order</label>
                  <input name="sortOrder" type="number" defaultValue={p.sortOrder} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                </div>
                <div className="flex items-center gap-2">
                  <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-3 py-1" />
                  <SaveStatus />
                  <ToggleDetails targetId={`edit-week-${p.id}`} label="Cancel" className="px-2 py-1 rounded-full border text-xs" />
                </div>
              </form>
            </div>
          </details>

          {/* Add Day task */}
          <form action={async (fd: FormData)=>{ 'use server'; fd.append('pathId', p.id); await addLearningTask(fd) }} className="mt-4 grid gap-3 md:grid-cols-6 items-end">
            <div>
              <label className="block text-sm mb-1">Training #</label>
              <input name="day" type="number" min={1} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="1" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Title</label>
              <input name="title" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Kick-off & Setup" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Program</label>
              <textarea name="programMd" rows={10} className="w-full rounded-xl border px-3 py-3 text-base min-h-[12rem]" placeholder="- Morning: ...&#10;- Afternoon: ..."></textarea>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Description (optional)</label>
              <textarea name="noteMd" rows={10} className="w-full rounded-xl border px-3 py-3 text-base min-h-[12rem]" placeholder="Notes, extra details..."></textarea>
            </div>
            {/* Attachment removed per request */}
            <div className="flex items-center gap-2">
              <SubmitButton label="Add Day" pendingLabel="Adding..." />
              <SaveStatus />
            </div>
          </form>

          {/* Existing tasks grouped by day */}
          <div className="mt-4">
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col className="w-16" />
                <col />
                <col className="w-28" />
                <col className="w-24" />
              </colgroup>
              <thead className="bg-neutral-50/80 text-neutral-600">
                <tr>
                  <th className="py-2 px-3 text-left">Training #</th>
                  <th className="py-2 px-3 text-left border-l">Title</th>
                  <th className="py-2 px-3 text-right border-l">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {(p.tasks||[]).map((t: any) => (
                  <>
                    <tr key={t.id} className="align-middle">
                      <td className="py-2 px-3">{t.day ?? 'X'}</td>
                      <td className="py-2 px-3 border-l">{t.title}</td>
                      <td className="py-2 px-3 border-l text-right">
                        <div className="inline-flex items-center gap-2">
                          <ToggleDetails targetId={`edit-task-${t.id}`} label="Edit" className="px-2 py-1 rounded-full border text-xs" />
                          <form action={async ()=>{ 'use server'; await deleteLearningTask(t.id) }}>
                            <ConfirmDelete
                              className="px-2 py-1 rounded-full border text-xs"
                              prompt="Delete this training?"
                              yesLabel="Delete"
                            />
                          </form>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="bg-neutral-50">
                        <details id={`edit-task-${t.id}`}>
                          <summary className="hidden">Edit training</summary>
                          <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                            <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', t.id); await updateLearningTask(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                              <div>
                                <label className="block text-sm mb-1">Training #</label>
                                <input name="day" type="number" defaultValue={t.day ?? ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm mb-1">Title</label>
                                <input name="title" defaultValue={t.title} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-sm mb-1">Program</label>
                                <textarea name="programMd" rows={10} defaultValue={t.programMd || ''} className="w-full rounded-xl border px-3 py-3 text-base bg-white min-h-[12rem]"></textarea>
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-sm mb-1">Description</label>
                                <textarea name="noteMd" rows={10} defaultValue={t.noteMd || ''} className="w-full rounded-xl border px-3 py-3 text-base bg-white min-h-[12rem]"></textarea>
                              </div>
                              <div className="flex items-center gap-2">
                                <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-3 py-1" />
                                <SaveStatus />
                                <ToggleDetails targetId={`edit-task-${t.id}`} label="Cancel" className="px-2 py-1 rounded-full border text-xs" />
                              </div>
                            </form>
                            {/* Attachments section: separate form (no nesting) */}
                            {(Array.isArray(t.attachments) && t.attachments.length > 0) && (
                              <div className="mt-3">
                                <label className="block text-sm mb-1">Attachments</label>
                                <div className="flex flex-wrap gap-2">
                                  {t.attachments.map((a: any, i: number) => (
                                    <a key={i} href={a.url} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs bg-white hover:bg-neutral-50">
                                      <span className="truncate max-w-[14rem]">{a.name || 'Attachment'}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                            <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', t.id); await addLearningTaskAttachment(fd) }} encType="multipart/form-data" className="mt-2 grid gap-2">
                              <div className="flex items-center gap-2">
                                <input name="att_name" className="w-40 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="Name" />
                                <input name="att_url" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://... (optional if uploading)" />
                              </div>
                              <div className="flex items-center gap-2">
                                <input name="att_file_name" className="w-40 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="Name (if uploading)" />
                                <input name="att_file" type="file" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" />
                                <SubmitButton label="Add Attachment" pendingLabel="Adding..." className="text-xs px-3 py-2" />
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
          </div>
        </section>
      ))}
    </div>
  )
}

async function AllTrainingsEditor() {
  const client: any = (await import('@/lib/db')).prisma as any
  let rows: any[] = []
  try {
    rows = await client.$queryRawUnsafe(
      `SELECT t.*, p.title as "pathTitle" FROM "LearningTask" t
       JOIN "LearningPath" p ON p.id = t."pathId"
       ORDER BY p."sortOrder" ASC, p."title" ASC, COALESCE(t."day", 9999) ASC, t."position" ASC`
    )
  } catch {
    rows = []
  }
  if (!rows.length) return <div className="mt-4 text-sm text-neutral-600">No trainings yet.</div>
  return (
    <div className="mt-4">
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-[28%]" />
          <col />
          <col className="w-32" />
        </colgroup>
        <thead className="bg-neutral-50/80 text-neutral-600">
          <tr>
            <th className="py-2 px-3 text-left">Training</th>
            <th className="py-2 px-3 text-left border-l">Title</th>
            <th className="py-2 px-3 text-right border-l">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[hsl(var(--border))]">
          {rows.map((t: any) => (
            <>
              <tr key={t.id} className="align-middle">
                <td className="py-2 px-3">{t.pathTitle} - {t.day == null ? 'Extras' : `Training ${t.day}`}</td>
                <td className="py-2 px-3 border-l">{t.title}</td>
                <td className="py-2 px-3 border-l text-right">
                  <div className="inline-flex items-center gap-2">
                    <ToggleDetails targetId={`flat-edit-${t.id}`} label="Edit" className="px-2 py-1 rounded-full border text-xs" />
                    <form action={async ()=>{ 'use server'; await deleteLearningTask(t.id) }}>
                      <ConfirmDelete
                        className="px-2 py-1 rounded-full border text-xs"
                        prompt="Delete this training?"
                        yesLabel="Delete"
                      />
                    </form>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="bg-neutral-50">
                  <details id={`flat-edit-${t.id}`}>
                    <summary className="hidden">Edit training</summary>
                    <div className="p-3 border-t border-[hsl(var(--border))] bg-neutral-50">
                      <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', t.id); await updateLearningTask(fd) }} className="grid gap-3 md:grid-cols-6 items-end">
                        <div>
                          <label className="block text-sm mb-1">Training #</label>
                          <input name="day" type="number" defaultValue={t.day ?? ''} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm mb-1">Title</label>
                          <input name="title" defaultValue={t.title} className="w-full rounded-xl border px-3 py-2 text-sm bg-white" />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm mb-1">Program</label>
                          <textarea name="programMd" rows={10} defaultValue={t.programMd || ''} className="w-full rounded-xl border px-3 py-3 text-base bg-white min-h-[12rem]"></textarea>
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm mb-1">Description</label>
                          <textarea name="noteMd" rows={10} defaultValue={t.noteMd || ''} className="w-full rounded-xl border px-3 py-3 text-base bg-white min-h-[12rem]"></textarea>
                        </div>
                        <div className="flex items-center gap-2">
                          <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-3 py-1" />
                          <SaveStatus />
                          <ToggleDetails targetId={`flat-edit-${t.id}`} label="Cancel" className="px-2 py-1 rounded-full border text-xs" />
                        </div>
                      </form>
                      {/* Attachments section: separate form (no nesting) */}
                      {(Array.isArray(t.attachments) && t.attachments.length > 0) && (
                        <div className="mt-3">
                          <label className="block text-sm mb-1">Attachments</label>
                          <div className="flex flex-wrap gap-2">
                            {t.attachments.map((a: any, i: number) => (
                              <a key={i} href={a.url} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs bg-white hover:bg-neutral-50">
                                <span className="truncate max-w-[14rem]">{a.name || 'Attachment'}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      <form action={async (fd: FormData)=>{ 'use server'; fd.append('id', t.id); await addLearningTaskAttachment(fd) }} encType="multipart/form-data" className="mt-2 grid gap-2">
                        <div className="flex items-center gap-2">
                          <input name="att_name" className="w-40 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="Name" />
                          <input name="att_url" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="https://... (optional if uploading)" />
                        </div>
                        <div className="flex items-center gap-2">
                          <input name="att_file_name" className="w-40 rounded-xl border px-3 py-2 text-sm bg-white" placeholder="Name (if uploading)" />
                          <input name="att_file" type="file" className="flex-1 rounded-xl border px-3 py-2 text-sm bg-white" />
                          <SubmitButton label="Add Attachment" pendingLabel="Adding..." className="text-xs px-3 py-2" />
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
    </div>
  )
}
