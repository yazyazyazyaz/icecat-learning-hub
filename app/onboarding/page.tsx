import { prisma } from "@/lib/db";
import { flags } from "@/lib/flags";
import { CalendarDays } from "lucide-react";

export const runtime = "nodejs";
export const revalidate = 0;

export default async function OnboardingPage({ searchParams }: { searchParams?: { path?: string } }) {
  if (!flags.onboarding) return null;

  const client: any = prisma as any
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
  if (!paths.length) return <div className="p-6">No learning paths imported yet.</div>;

  const currentSlug = searchParams?.path ?? "onboarding-week";
  const current = (paths as any[]).find((p: any) => p.slug === currentSlug) ?? (paths as any[])[0];

  const byDay = new Map<string, any[]>();
  for (const t of (current as any).tasks as any) {
    const k = (t as any).day == null ? "X" : String((t as any).day);
    if (!byDay.has(k)) byDay.set(k, []);
    (byDay.get(k)!).push(t);
  }
  const groups = Array.from(byDay.entries())
    .sort((a,b) => ((a[0] === "X") as any) - ((b[0] === "X") as any) || Number(a[0]) - Number(b[0]));
  // Flatten to accordion list per week (compact)
  const itemsSorted = ((current as any).tasks as any[]).slice().sort((a: any,b: any)=>{
    const ad = a.day == null ? 9999 : Number(a.day)
    const bd = b.day == null ? 9999 : Number(b.day)
    if (ad !== bd) return ad - bd
    return (a.position||0) - (b.position||0)
  })

  // neutral theme for headers/borders
  function styleForDay(_key: string) {
    return { border: 'border-neutral-300', header: 'bg-neutral-50 text-neutral-900' } as const
  }

  const dayPalette = [
    'text-blue-700',
    'text-emerald-700',
    'text-purple-700',
    'text-amber-700',
    'text-rose-700',
    'text-teal-700',
    'text-fuchsia-700',
    'text-cyan-700',
    'text-orange-700',
    'text-lime-700',
  ] as const
  function colorForDay(day: number | null | undefined) {
    if (!day || isNaN(Number(day))) return ''
    const idx = (Number(day) - 1) % dayPalette.length
    return dayPalette[idx]
  }
  const isBonusPath = String((current as any).slug || '').toLowerCase() === 'bonus'
  const extrasOrder = new Map<string, number>()
  { // compute 1-based order among extras (day == null)
    let n = 0
    for (const it of itemsSorted) {
      if (it.day == null) { n++; extrasOrder.set(String(it.id), n) }
    }
  }

  return (
    <div className="mx-auto max-w-6xl xl:max-w-7xl 2xl:max-w-screen-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="w-5 h-5 text-neutral-600" />
        <h1 className="text-xl font-semibold">Onboarding</h1>
      </div>

      <nav className="flex flex-wrap gap-2 mb-2">
        {(paths as any[]).map((p: any) => {
          const active = p.slug === current.slug
          const label = (() => {
            switch (String(p.slug)) {
              case 'onboarding-week': return 'Onboarding week'
              case 'third-week': return 'Week Two'
              case 'fourth-week': return 'Week Three'
              case 'bonus': return 'Bonus'
              default: return p.title
            }
          })()
          return (
            <a key={p.slug} href={`/onboarding?path=${p.slug}`}
               className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                 active ? 'bg-white border-neutral-400 text-neutral-900 font-medium shadow-sm' : 'bg-white/70 border-neutral-200 hover:bg-neutral-50'
               }`}>
              {label}
            </a>
          )
        })}
      </nav>

      {/* Accordion list (compact, per week) */}

      <div className="grid gap-3">
        {itemsSorted.map((item: any) => (
          <details key={item.id} className="group rounded-lg border bg-white open:border-blue-500 open:ring-2 open:ring-blue-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium transition-colors group-open:bg-blue-50 group-open:text-blue-900">
              {item.day == null ? (
                <>
                  <span className={colorForDay(extrasOrder.get(String(item.id)) || 1)}>{isBonusPath ? 'Bonus' : 'Extras'} {extrasOrder.get(String(item.id))}</span>
                  <span className="mx-1 text-neutral-400">—</span>
                  <span>{item.title}</span>
                </>
              ) : (
                <>
                  <span>Training {item.day}</span>
                  <span className="mx-1">-</span>
                  <span className={colorForDay(item.day)}>Day {item.day}</span>
                  <span className="mx-1 text-neutral-400">—</span>
                  <span>{item.title}</span>
                </>
              )}
            </summary>
            <div className="p-3 border-t bg-neutral-50 space-y-3">
              {item.programMd && (
                <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-white border rounded-lg p-3">{item.programMd}</pre>
              )}
              {Array.isArray(item.attachments) && item.attachments.length > 0 && (() => {
                const atts = (item.attachments as any[])
                const isImage = (u: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(?:\?.*)?$/i.test(String(u||''))
                const imgAtts = atts.filter((a: any) => isImage(a?.url))
                const otherAtts = atts.filter((a: any) => !isImage(a?.url))
                return (
                  <div className="text-sm">
                    <div className="mb-1 font-medium">Attachments</div>
                    {imgAtts.length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-2">
                        {imgAtts.map((a: any, i: number) => (
                          <a key={`img-${i}`} href={a.url} target="_blank" className="block">
                            <div className="border rounded-lg bg-white p-1 shadow-sm hover:shadow transition">
                              <img src={a.url} alt={a.name || 'Image attachment'} loading="lazy" className="object-contain" style={{ maxWidth: 500, maxHeight: 500 }} />
                              <div className="px-1 py-1 text-[11px] text-neutral-600 truncate max-w-[500px]">{a.name || 'Image'}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    {otherAtts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {otherAtts.map((a: any, i: number) => (
                          <a key={`file-${i}`} href={a.url} target="_blank" className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white hover:bg-neutral-50">
                            <span className="truncate max-w-[16rem]">{a.name || 'Attachment'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()}
              {item.noteMd && (
                <pre className="whitespace-pre-wrap text-xs leading-relaxed bg-neutral-50 border border-neutral-200 text-neutral-800 rounded-lg p-3">{item.noteMd}</pre>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
