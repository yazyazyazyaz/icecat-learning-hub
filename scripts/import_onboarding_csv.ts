/* scripts/import_onboarding_csv.ts
   Imports onboarding learning paths + tasks from CSV file at data/learning_paths.csv
   Expected columns (first row may be headers):
   0: Title
   1: Learning path (e.g., Onboarding week | Third week | Fourth week | BONUS)
   2: Program (long)
   3: Note/Description (long)
   4: Attachment ("Name (https://url)")
   5: Trainer (free text)
   6: Extra notes (optional)
   7: Extra notes 2 (optional)
*/
import { prisma } from "@/lib/db"
import { promises as fs } from 'fs'
import path from 'path'

function parseCSV(input: string): string[][] {
  const rows: string[][] = []
  let i = 0, field = '', row: string[] = []
  let inQuotes = false
  while (i < input.length) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        const next = input[i+1]
        if (next === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      } else { field += ch; i++; continue }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue }
      if (ch === ',') { row.push(field); field = ''; i++; continue }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
      if (ch === '\r') { i++; continue }
      field += ch; i++
    }
  }
  if (field.length > 0 || row.length) { row.push(field); rows.push(row) }
  return rows
}

function slugify(s: string) {
  return (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function cleanMd(s: string) { return (s || '').replace(/#NAME\?/g, '').trim() }

function parseAttachment(s: string): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = []
  const m = /([^()]+)\((https?:[^)]+)\)/.exec(s || '')
  if (m) out.push({ name: m[1].trim().replace(/\s+$/,'') || 'Attachment', url: m[2].trim() })
  return out
}

async function upsertWeek(slug: string, title: string, sortOrder: number) {
  const client: any = prisma as any
  try {
    if (client.learningPath) {
      return await client.learningPath.upsert({ where: { slug }, update: { title, sortOrder }, create: { slug, title, sortOrder } })
    }
  } catch {}
  const rows: any[] = await client.$queryRawUnsafe(
    `INSERT INTO "LearningPath" ("id","slug","title","sortOrder","createdAt","updatedAt")
     VALUES ((SELECT md5(random()::text || clock_timestamp()::text)),$1,$2,$3,NOW(),NOW())
     ON CONFLICT ("slug") DO UPDATE SET "title"=EXCLUDED."title", "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=NOW()
     RETURNING *`, slug, title, sortOrder)
  return rows[0]
}

async function upsertTask(pathId: string, day: number|null, title: string, programMd: string|null, noteMd: string|null, trainer: string|null, attachments: any[], positionHint?: number) {
  const client: any = prisma as any
  try {
    if (client.learningTask) {
      const max = await client.learningTask.findFirst({ where: { pathId, day }, orderBy: { position: 'desc' }, select: { position: true } })
      const position = (max?.position || 0) + 1
      return await client.learningTask.upsert({
        where: { pathId_day_title: { pathId, day, title } },
        update: { programMd, noteMd, trainer, attachments, position },
        create: { pathId, day, title, programMd, noteMd, trainer, attachments, position },
      })
    }
  } catch {}
  const maxRows: any[] = await client.$queryRawUnsafe(
    `SELECT COALESCE(MAX("position"),0) AS maxpos FROM "LearningTask" WHERE "pathId"=$1 AND (("day" IS NULL AND $2::int IS NULL) OR ("day"=$2))`, pathId, day)
  const position = Number(maxRows?.[0]?.maxpos || 0) + 1
  const rows: any[] = await client.$queryRawUnsafe(
    `INSERT INTO "LearningTask" ("id","pathId","day","title","programMd","noteMd","trainer","attachments","position","createdAt","updatedAt")
     VALUES ((SELECT md5(random()::text || clock_timestamp()::text)),$1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),NOW())
     ON CONFLICT ("pathId","day","title") DO UPDATE SET
       "programMd"=EXCLUDED."programMd",
       "noteMd"=EXCLUDED."noteMd",
       "trainer"=EXCLUDED."trainer",
       "attachments"=EXCLUDED."attachments",
       "position"=EXCLUDED."position",
       "updatedAt"=NOW()
     RETURNING *`, pathId, day, title, programMd, noteMd, trainer, JSON.stringify(attachments), position)
  return rows[0]
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'learning_paths.csv')
  const raw = await fs.readFile(csvPath, 'utf8')
  const rows = parseCSV(raw)
  if (!rows.length) throw new Error('CSV empty')
  const start = (rows[0]?.[1] && /learning\s*path/i.test(rows[0][1])) ? 1 : 0

  const orderPref = ['Onboarding week','Third week','Fourth week','BONUS']
  const orderFor = (t: string) => { const ix = orderPref.indexOf(t); return ix >= 0 ? ix : 999 }

  const mapByTitle = new Map<string, any>()

  for (let i=start; i<rows.length; i++) {
    const cols = rows[i]
    if (!cols?.length) continue
    const titleRaw = (cols[0] || '').trim()
    const pathTitle = (cols[1] || '').trim() || 'Onboarding week'
    if (!titleRaw) continue
    const dm = /^\s*(\d+)\s*[–-]\s*(.*)$/.exec(titleRaw)
    const day = dm ? Number(dm[1]) : null
    const title = dm ? dm[2].trim() : titleRaw
    const program = cleanMd(cols[2] || '')
    const note = cleanMd(cols[3] || '')
    const attach = parseAttachment(cols[4] || '')
    const trainer = (cols[5] || '').trim() || null
    const extra = cleanMd(((cols[6] || '') + (cols[7] ? '\n\n' + cols[7] : '')).trim())
    const noteMd = [note, extra].filter(Boolean).join('\n\n') || null
    const programMd = program || null

    // Upsert path
    const slug = slugify(pathTitle) || 'onboarding-week'
    let pathRow = mapByTitle.get(pathTitle)
    if (!pathRow) {
      pathRow = await upsertWeek(slug, pathTitle, orderFor(pathTitle))
      mapByTitle.set(pathTitle, pathRow)
    }
    await upsertTask(String(pathRow.id), day, title, programMd, noteMd, trainer, attach)
  }
  console.log('Onboarding CSV import completed.')
}

main().catch((e)=>{ console.error(e); process.exit(1) })

