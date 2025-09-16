/* scripts/import_repo_content.ts
   Imports versioned JSON from data/seed/* into the DB (idempotent upserts).
*/
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'

async function readIfExists(rel: string) {
  const p = path.join(process.cwd(), 'data', 'seed', rel)
  try { const s = await fs.readFile(p, 'utf8'); return JSON.parse(s) } catch { return null }
}

async function importUploads() {
  const rows = await readIfExists('uploads.json') as Array<{ title: string; path: string; tags: string[]; kind: 'PRESENTATION'|'DOCUMENT' }>|null
  if (!rows?.length) return
  for (const r of rows) {
    const existing = await prisma.upload.findFirst({ where: { path: r.path } })
    if (existing) {
      await prisma.upload.update({ where: { id: existing.id }, data: { title: r.title, tags: r.tags, kind: r.kind as any, path: r.path } })
    } else {
      await prisma.upload.create({ data: { title: r.title, path: r.path, tags: r.tags, kind: r.kind as any } })
    }
  }
}

async function importPresentations() {
  const rows = await readIfExists('presentations.json') as Array<{ title: string; description?: string|null; path: string; audience: 'RETAILERS'|'BRANDS'; tags: string[] }>|null
  if (!rows?.length) return
  for (const r of rows) {
    const existing = await prisma.presentation.findFirst({ where: { title: r.title, audience: r.audience as any } })
    if (existing) {
      await prisma.presentation.update({ where: { id: existing.id }, data: { description: r.description ?? null, path: r.path, tags: r.tags } })
    } else {
      await prisma.presentation.create({ data: { title: r.title, description: r.description ?? null, path: r.path, audience: r.audience as any, tags: r.tags } })
    }
  }
}

async function importDocuments() {
  const rows = await readIfExists('documents.json') as Array<{ title: string; path: string; tags: string[] }>|null
  if (!rows?.length) return
  for (const r of rows) {
    const existing = await prisma.documentFile.findFirst({ where: { path: r.path } })
    if (existing) {
      await prisma.documentFile.update({ where: { id: existing.id }, data: { title: r.title, tags: r.tags } })
    } else {
      await prisma.documentFile.create({ data: { title: r.title, path: r.path, tags: r.tags } })
    }
  }
}

async function importTrainings() {
  const rows = await readIfExists('trainings.json') as Array<any>|null
  if (!rows?.length) return
  for (const t of rows) {
    const tr = await prisma.training.upsert({
      where: { slug: t.slug },
      update: { title: t.title, summary: t.summary, isMandatory: !!t.isMandatory, durationMinutes: Number(t.durationMinutes||0), tags: t.tags||[] },
      create: { slug: t.slug, title: t.title, summary: t.summary||'', isMandatory: !!t.isMandatory, durationMinutes: Number(t.durationMinutes||0), tags: t.tags||[] },
      select: { id: true }
    })
    // Modules and lessons
    for (const m of (t.modules||[])) {
      // Find or create by training + title
      const mod = await prisma.module.findFirst({ where: { trainingId: tr.id, title: m.title }, select: { id: true } })
      const modId = mod?.id || (await prisma.module.create({ data: { trainingId: tr.id, title: m.title, order: Number(m.order||0) } })).id
      if (mod && typeof m.order === 'number') await prisma.module.update({ where: { id: modId }, data: { order: Number(m.order) } })
      for (const l of (m.lessons||[])) {
        await prisma.lesson.upsert({
          where: { slug: l.slug },
          update: { moduleId: modId, title: l.title, bodyMdx: l.bodyMdx ?? null, externalUrl: l.externalUrl ?? null, order: Number(l.order||0) },
          create: { moduleId: modId, title: l.title, slug: l.slug, bodyMdx: l.bodyMdx ?? null, externalUrl: l.externalUrl ?? null, order: Number(l.order||0) },
        })
      }
    }
  }
}

async function importLearningPaths() {
  const rows = await readIfExists('learningPaths.json') as Array<any>|null
  if (!rows?.length) return
  for (const p of rows) {
    // @ts-ignore
    const lp = await (prisma as any).learningPath.upsert({ where: { slug: p.slug }, update: { title: p.title, sortOrder: Number(p.sortOrder||0) }, create: { slug: p.slug, title: p.title, sortOrder: Number(p.sortOrder||0) }, select: { id: true } })
    for (const t of (p.tasks||[])) {
      const data = {
        pathId: lp.id,
        day: (t.day === null || t.day === undefined) ? null : Number(t.day),
        title: t.title,
        programMd: t.programMd ?? null,
        noteMd: t.noteMd ?? null,
        trainer: t.trainer ?? null,
        attachments: t.attachments ?? [],
        position: Number(t.position || 0),
      }
      try {
        // Prefer upsert when day is not null (composite unique works reliably)
        if (data.day !== null) {
          // @ts-ignore
          await (prisma as any).learningTask.upsert({
            where: { pathId_day_title: { pathId: data.pathId, day: data.day, title: data.title } },
            update: { programMd: data.programMd, noteMd: data.noteMd, trainer: data.trainer, attachments: data.attachments, position: data.position },
            create: data as any,
          })
        } else {
          // When day is null, some Prisma clients require a manual find/update or create
          // @ts-ignore
          const existing = await (prisma as any).learningTask.findFirst({ where: { pathId: data.pathId, day: null, title: data.title }, select: { id: true } })
          if (existing?.id) {
            // @ts-ignore
            await (prisma as any).learningTask.update({ where: { id: existing.id }, data: { programMd: data.programMd, noteMd: data.noteMd, trainer: data.trainer, attachments: data.attachments, position: data.position } })
          } else {
            // @ts-ignore
            await (prisma as any).learningTask.create({ data })
          }
        }
      } catch (e) {
        console.warn('learningTask import failed for', data.title, e)
      }
    }
  }
}

async function main() {
  await importUploads()
  await importPresentations()
  await importDocuments()
  await importTrainings()
  await importLearningPaths()
  console.log('Import complete.')
}

main().catch((e)=>{ console.error(e); process.exit(1) })
