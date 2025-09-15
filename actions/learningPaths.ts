"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import path from 'path'
import { promises as fs } from 'fs'

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

type Attachment = { name: string; url: string }
function parseAttachment(s: string): Attachment[] {
  const out: Attachment[] = []
  const m = /([^()]+)\((https?:[^)]+)\)/.exec(s || '')
  if (m) out.push({ name: m[1].trim().replace(/\s+$/,'') || 'Attachment', url: m[2].trim() })
  return out
}

async function saveOnboardingFile(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const orig = (file as any).name || 'upload.bin'
  const ext = path.extname(orig) || ''
  const safeName = orig.replace(/[^a-zA-Z0-9._-]/g, '_') || `upload${ext || '.bin'}`
  const dir = path.join(process.cwd(), 'public', 'uploads', 'onboarding')
  await fs.mkdir(dir, { recursive: true })
  const fileName = `${Date.now()}_${safeName}`
  const abs = path.join(dir, fileName)
  await fs.writeFile(abs, bytes)
  return `/uploads/onboarding/${fileName}`
}

export async function importLearningPathsFromCSV(formData: FormData) {
  const raw = String(formData.get('csv') || '')
  if (!raw.trim()) return { ok: false, error: 'CSV is empty' }
  const rows = parseCSV(raw)
  const start = (rows[0]?.[1] && /learning\s*path/i.test(rows[0][1])) ? 1 : 0
  // Validate Prisma client has the new models (requires migrate + generate)
  const client = prisma as any
  if (!client?.learningPath || !client?.learningTask) {
    return {
      ok: false,
      error: 'Prisma client missing LearningPath/LearningTask. Run: npx prisma migrate dev -n "learning_paths" && prisma generate, then restart dev server.'
    }
  }

  type Item = { day: number|null; title: string; programMd?: string|null; noteMd?: string|null; trainer?: string|null; attachments?: Attachment[]; position: number }
  const byPath = new Map<string, { slug: string; title: string; items: Item[] }>()
  const posMap = new Map<string, number>()

  for (let r = start; r < rows.length; r++) {
    const cols = rows[r]
    if (!cols?.length) continue
    const titleRaw = (cols[0] || '').trim()
    const pathTitle = (cols[1] || '').trim() || 'Onboarding week'
    if (!titleRaw || /^(?:Title|Fourth Week)$/i.test(titleRaw)) continue
    const dm = /^\s*(\d+)\s*[–-]\s*(.*)$/.exec(titleRaw)
    const day = dm ? Number(dm[1]) : null
    const title = dm ? dm[2].trim() : titleRaw.trim()
    const program = cleanMd(cols[2] || '')
    const note = cleanMd(cols[3] || '')
    const attach = parseAttachment(cols[4] || '')
    const trainer = (cols[5] || '').trim() || null
    const note2 = cleanMd(((cols[6] || '') + (cols[7] ? '\n\n' + cols[7] : '')).trim())
    const noteMd = [note, note2].filter(Boolean).join('\n\n') || null
    const programMd = program || null

    if (!byPath.has(pathTitle)) byPath.set(pathTitle, { slug: slugify(pathTitle) || 'onboarding-week', title: pathTitle, items: [] })
    const key = `${pathTitle}|${day == null ? 'X' : day}`
    const pos = (posMap.get(key) || 0) + 1
    posMap.set(key, pos)
    byPath.get(pathTitle)!.items.push({ day, title, programMd, noteMd, trainer, attachments: attach, position: pos })
  }

  // Upsert into DB
  for (const p of byPath.values()) {
    const path = await client.learningPath.upsert({
      where: { slug: p.slug },
      update: { title: p.title },
      create: { slug: p.slug, title: p.title },
    })
    for (const t of p.items) {
      await client.learningTask.upsert({
        where: { pathId_day_title: { pathId: path.id, day: t.day, title: t.title } },
        update: {
          programMd: t.programMd ?? null,
          noteMd: t.noteMd ?? null,
          trainer: t.trainer ?? null,
          attachments: t.attachments ?? [],
          position: t.position ?? 0,
        },
        create: {
          pathId: path.id,
          day: t.day,
          title: t.title,
          programMd: t.programMd ?? null,
          noteMd: t.noteMd ?? null,
          trainer: t.trainer ?? null,
          attachments: t.attachments ?? [],
          position: t.position ?? 0,
        },
      })
    }
  }
  revalidatePath('/onboarding')
  return { ok: true }
}

async function requireTrainerOrAdmin() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) throw new Error('Forbidden')
}

export async function createLearningPath(formData: FormData) {
  await requireTrainerOrAdmin()
  const title = String(formData.get('title') || '').trim()
  if (!title) throw new Error('Missing title')
  const slug = slugify(String(formData.get('slug') || title)) || 'onboarding-week'
  const sortOrder = Number(formData.get('sortOrder') || 0)
  const client: any = prisma as any
  let path: any
  if (client.learningPath) {
    path = await client.learningPath.upsert({
      where: { slug },
      update: { title, sortOrder },
      create: { slug, title, sortOrder },
    })
  } else {
    const rows: any[] = await client.$queryRawUnsafe(
      `INSERT INTO "LearningPath" ("id","slug","title","sortOrder","createdAt","updatedAt")
       VALUES ((SELECT md5(random()::text || clock_timestamp()::text)),$1,$2,$3,NOW(),NOW())
       ON CONFLICT ("slug") DO UPDATE SET "title"=EXCLUDED."title", "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=NOW()
       RETURNING *`, slug, title, sortOrder)
    path = rows[0]
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true, path }
}

export async function deleteLearningPath(id: string) {
  await requireTrainerOrAdmin()
  const client: any = prisma as any
  if (client.learningPath) {
    await client.learningTask.deleteMany({ where: { pathId: id } })
    await client.learningPath.delete({ where: { id } })
  } else {
    await client.$executeRawUnsafe(`DELETE FROM "LearningTask" WHERE "pathId"=$1`, id)
    await client.$executeRawUnsafe(`DELETE FROM "LearningPath" WHERE "id"=$1`, id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

export async function addLearningTask(formData: FormData) {
  await requireTrainerOrAdmin()
  const client: any = prisma as any
  const pathId = String(formData.get('pathId') || '')
  const dayRaw = String(formData.get('day') || '').trim()
  const day = dayRaw ? Number(dayRaw) : null
  const title = String(formData.get('title') || '').trim()
  const programMd = String(formData.get('programMd') || '').trim() || null
  const noteMd = String(formData.get('noteMd') || '').trim() || null
  const trainer = String(formData.get('trainer') || '').trim() || null
  // attachments (multiple): links and/or files
  const names = formData.getAll('att_name').map(String)
  const urls = formData.getAll('att_url').map(String)
  const attachments: Attachment[] = []
  for (let i=0;i<Math.max(names.length, urls.length);i++) {
    const n = (names[i] || '').trim()
    const u = (urls[i] || '').trim()
    if (n && u) attachments.push({ name: n, url: u })
  }
  // file attachments
  const fileInputs = formData.getAll('att_file') as any[]
  const fileNames = formData.getAll('att_file_name').map(String)
  for (let i=0;i<fileInputs.length;i++) {
    const f = fileInputs[i] as any
    if (f && typeof f === 'object' && 'arrayBuffer' in f && (f as any).size > 0) {
      const url = await saveOnboardingFile(f as File)
      const name = (fileNames[i] || (f as any).name || 'Attachment').trim()
      attachments.push({ name: name || 'Attachment', url })
    }
  }
  // compute next position within (path, day)
  let task: any
  if (client.learningTask) {
    const max = await client.learningTask.findFirst({ where: { pathId, day }, orderBy: { position: 'desc' }, select: { position: true } })
    const position = (max?.position || 0) + 1
    task = await client.learningTask.upsert({
      where: { pathId_day_title: { pathId, day, title } },
      update: { programMd, noteMd, trainer, attachments, position },
      create: { pathId, day, title, programMd, noteMd, trainer, attachments, position },
    })
  } else {
    const maxRows: any[] = await client.$queryRawUnsafe(
      `SELECT COALESCE(MAX("position"),0) AS maxpos FROM "LearningTask" WHERE "pathId"=$1 AND (("day" IS NULL AND $2::int IS NULL) OR ("day"=$2))`,
      pathId, day)
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
    task = rows[0]
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true, task }
}

export async function deleteLearningTask(id: string) {
  await requireTrainerOrAdmin()
  const client: any = prisma as any
  if (client.learningTask) {
    await client.learningTask.delete({ where: { id } })
  } else {
    await client.$executeRawUnsafe(`DELETE FROM "LearningTask" WHERE "id"=$1`, id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

export async function seedDummyLearningPaths() {
  await requireTrainerOrAdmin()
  const client: any = prisma as any
  const weeks = [
    { slug: 'onboarding-week', title: 'Onboarding week', sortOrder: 0 },
    { slug: 'third-week', title: 'Third week', sortOrder: 1 },
    { slug: 'fourth-week', title: 'Fourth week', sortOrder: 2 },
  ]
  for (const w of weeks) {
    const path = await client.learningPath.upsert({ where: { slug: w.slug }, update: { title: w.title, sortOrder: w.sortOrder }, create: w })
    for (let d=1; d<=5; d++) {
      const title = `Day ${d} — Intro & Practice`
      const programMd = `- Morning: Topic overview\n- Afternoon: Hands-on task #${d}`
      const noteMd = `Remember to ask questions and share findings.`
      const trainer = d % 2 ? 'Lana' : 'Sandra'
      const attachments: Attachment[] = [ { name: 'Reference Manual', url: 'https://iceclog.com/manuals-csv-interface/' } ]
      const max = await client.learningTask.findFirst({ where: { pathId: path.id, day: d }, orderBy: { position: 'desc' }, select: { position: true } })
      const position = (max?.position || 0) + 1
      await client.learningTask.upsert({
        where: { pathId_day_title: { pathId: path.id, day: d, title } },
        update: { programMd, noteMd, trainer, attachments, position },
        create: { pathId: path.id, day: d, title, programMd, noteMd, trainer, attachments, position },
      })
    }
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

// Reorder weeks (LearningPath.sortOrder) up/down
export async function moveLearningPath(formData: FormData) {
  await requireTrainerOrAdmin()
  const id = String(formData.get('id') || '')
  const dir = String(formData.get('dir') || 'up') // 'up' | 'down'
  if (!id || (dir !== 'up' && dir !== 'down')) throw new Error('Invalid input')
  const client: any = prisma as any
  if (client.learningPath) {
    const me = await client.learningPath.findUnique({ where: { id }, select: { id: true, sortOrder: true } })
    if (!me) throw new Error('Week not found')
    const neighbor = await client.learningPath.findFirst({
      where: dir === 'up' ? { sortOrder: { lt: me.sortOrder } } : { sortOrder: { gt: me.sortOrder } },
      orderBy: { sortOrder: dir === 'up' ? 'desc' : 'asc' },
      select: { id: true, sortOrder: true },
    })
    if (!neighbor) return { ok: true }
    await client.$transaction([
      client.learningPath.update({ where: { id: me.id }, data: { sortOrder: neighbor.sortOrder } }),
      client.learningPath.update({ where: { id: neighbor.id }, data: { sortOrder: me.sortOrder } }),
    ])
  } else {
    // Raw SQL fallback
    const rows: any[] = await client.$queryRawUnsafe(`SELECT "id","sortOrder" FROM "LearningPath" WHERE "id"=$1`, id)
    const me = rows?.[0]
    if (!me) throw new Error('Week not found')
    const neighRows: any[] = await client.$queryRawUnsafe(
      `SELECT "id","sortOrder" FROM "LearningPath" WHERE ${dir==='up'? '"sortOrder" < $1 ORDER BY "sortOrder" DESC' : '"sortOrder" > $1 ORDER BY "sortOrder" ASC'} LIMIT 1`,
      me.sortOrder)
    const n = neighRows?.[0]
    if (!n) return { ok: true }
    await client.$executeRawUnsafe(`UPDATE "LearningPath" SET "sortOrder"=$1 WHERE "id"=$2`, n.sortOrder, me.id)
    await client.$executeRawUnsafe(`UPDATE "LearningPath" SET "sortOrder"=$1 WHERE "id"=$2`, me.sortOrder, n.id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

// Bulk add/update many learning tasks via simple pipe-delimited lines per week
// Format per line: Day|Title|Program|Description|Trainer|AttachmentName|AttachmentURL
export async function bulkImportLearningTasks(formData: FormData) {
  await requireTrainerOrAdmin()
  const client: any = prisma as any
  const pathId = String(formData.get('pathId') || '')
  const raw = String(formData.get('bulk') || '')
  if (!pathId || !raw.trim()) throw new Error('Missing fields')
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  async function nextPos(day: number|null) {
    const r: any[] = await client.$queryRawUnsafe(
      `SELECT COALESCE(MAX("position"),0) AS maxpos FROM "LearningTask" WHERE "pathId"=$1 AND (("day" IS NULL AND $2::int IS NULL) OR ("day"=$2))`,
      pathId, day)
    return Number(r?.[0]?.maxpos || 0) + 1
  }

  for (const line of lines) {
    const parts = line.split('|').map(s => s.trim())
    const [dayStr, title, programMd, noteMd, trainer, attName, attUrl] = [
      parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || '', parts[5] || '', parts[6] || ''
    ]
    const day = dayStr ? Number(dayStr) : null
    if (!title) continue
    const attachments = (attName && attUrl) ? [{ name: attName, url: attUrl }] : []
    if (client.learningTask) {
      const max = await client.learningTask.findFirst({ where: { pathId, day }, orderBy: { position: 'desc' }, select: { position: true } })
      const position = (max?.position || 0) + 1
      await client.learningTask.upsert({
        where: { pathId_day_title: { pathId, day, title } },
        update: { programMd: programMd || null, noteMd: noteMd || null, trainer: trainer || null, attachments, position },
        create: { pathId, day, title, programMd: programMd || null, noteMd: noteMd || null, trainer: trainer || null, attachments, position },
      })
    } else {
      const position = await nextPos(day)
      await client.$queryRawUnsafe(
        `INSERT INTO "LearningTask" ("id","pathId","day","title","programMd","noteMd","trainer","attachments","position","createdAt","updatedAt")
         VALUES ((SELECT md5(random()::text || clock_timestamp()::text)),$1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),NOW())
         ON CONFLICT ("pathId","day","title") DO UPDATE SET
           "programMd"=EXCLUDED."programMd",
           "noteMd"=EXCLUDED."noteMd",
           "trainer"=EXCLUDED."trainer",
           "attachments"=EXCLUDED."attachments",
           "position"=EXCLUDED."position",
           "updatedAt"=NOW()`,
        pathId, day, title, programMd || null, noteMd || null, trainer || null, JSON.stringify(attachments), position)
    }
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

// Update week fields
export async function updateLearningPath(formData: FormData) {
  await requireTrainerOrAdmin()
  const id = String(formData.get('id') || '')
  if (!id) throw new Error('Missing id')
  const title = String(formData.get('title') || '').trim() || undefined
  const slug = String(formData.get('slug') || '').trim() || undefined
  const sortOrderRaw = String(formData.get('sortOrder') || '').trim()
  const sortOrder = sortOrderRaw === '' ? undefined : Number(sortOrderRaw)
  const client: any = prisma as any
  if (client.learningPath) {
    await client.learningPath.update({ where: { id }, data: { ...(title?{title}:{}) , ...(slug?{slug}:{}) , ...(sortOrder!==undefined?{sortOrder}:{}) } })
  } else {
    if (title !== undefined) await client.$executeRawUnsafe(`UPDATE "LearningPath" SET "title"=$1 WHERE "id"=$2`, title, id)
    if (slug !== undefined) await client.$executeRawUnsafe(`UPDATE "LearningPath" SET "slug"=$1 WHERE "id"=$2`, slug, id)
    if (sortOrder !== undefined) await client.$executeRawUnsafe(`UPDATE "LearningPath" SET "sortOrder"=$1 WHERE "id"=$2`, sortOrder, id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

// Update a single learning task
export async function updateLearningTask(formData: FormData) {
  await requireTrainerOrAdmin()
  const id = String(formData.get('id') || '')
  if (!id) throw new Error('Missing id')
  const dayRaw = String(formData.get('day') || '').trim()
  const day = dayRaw ? Number(dayRaw) : null
  const title = String(formData.get('title') || '').trim() || undefined
  const programMd = String(formData.get('programMd') || '').trim() || null
  const noteMd = String(formData.get('noteMd') || '').trim() || null
  const client: any = prisma as any
  if (client.learningTask) {
    const current = await client.learningTask.findUnique({ where: { id }, select: { attachments: true } })
    await client.learningTask.update({ where: { id }, data: {
      ...(title?{title}:{ }),
      day,
      programMd,
      noteMd,
    } })
  } else {
    if (title !== undefined) await client.$executeRawUnsafe(`UPDATE "LearningTask" SET "title"=$1 WHERE "id"=$2`, title, id)
    await client.$executeRawUnsafe(`UPDATE "LearningTask" SET "day"=$1, "programMd"=$2, "noteMd"=$3 WHERE "id"=$4`, day, programMd, noteMd, id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}

// Append a new attachment (file or link) to an existing learning task
export async function addLearningTaskAttachment(formData: FormData) {
  await requireTrainerOrAdmin()
  const id = String(formData.get('id') || '')
  if (!id) throw new Error('Missing id')
  const client: any = prisma as any

  const newAttachments: Attachment[] = []
  // Links (support multiple rows)
  const linkNames = formData.getAll('att_name').map(String)
  const linkUrls = formData.getAll('att_url').map(String)
  for (let i=0;i<Math.max(linkNames.length, linkUrls.length);i++) {
    const n = (linkNames[i] || '').trim()
    const u = (linkUrls[i] || '').trim()
    if (n && u) newAttachments.push({ name: n, url: u })
  }
  // Files
  const fileInputs = formData.getAll('att_file') as any[]
  const fileNames = formData.getAll('att_file_name').map(String)
  for (let i=0;i<fileInputs.length;i++) {
    const f = fileInputs[i] as any
    if (f && typeof f === 'object' && 'arrayBuffer' in f && (f as any).size > 0) {
      const url = await saveOnboardingFile(f as File)
      const name = (fileNames[i] || (f as any).name || 'Attachment').trim()
      newAttachments.push({ name: name || 'Attachment', url })
    }
  }
  if (!newAttachments.length) return { ok: false, error: 'No attachment provided' }

  if (client.learningTask) {
    const current = await client.learningTask.findUnique({ where: { id }, select: { attachments: true } })
    const curr = Array.isArray(current?.attachments) ? (current!.attachments as any[]) : []
    await client.learningTask.update({ where: { id }, data: { attachments: [...curr, ...newAttachments] } })
  } else {
    const rows: any[] = await client.$queryRawUnsafe(`SELECT "attachments" FROM "LearningTask" WHERE "id"=$1`, id)
    const curr = Array.isArray(rows?.[0]?.attachments) ? rows[0].attachments : []
    const next = JSON.stringify([...(curr || []), ...newAttachments])
    await client.$executeRawUnsafe(`UPDATE "LearningTask" SET "attachments"=$1::jsonb WHERE "id"=$2`, next, id)
  }
  revalidatePath('/editor/onboarding')
  revalidatePath('/onboarding')
  return { ok: true }
}
