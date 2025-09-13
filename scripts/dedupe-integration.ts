/*
  Remove duplicate Integration File links (by exact path), keeping the most recently updated record.
  - Prefer DocumentFile over legacy Upload when both contain the same path
  - Within each model, keep the newest (updatedAt) and delete the rest
*/
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const report = { deleted: [] as Array<{ model: string; id: string; path: string }>, kept: [] as Array<{ model: string; id: string; path: string }> }

  // Load all records from both models (only DOCUMENT uploads for legacy)
  const [docs, uploads] = await Promise.all([
    (prisma as any).documentFile.findMany().catch(() => [] as any[]),
    prisma.upload.findMany({ where: { kind: 'DOCUMENT' as any } }).catch(() => [] as any[]),
  ])

  // Normalize map: path -> records across models
  type Rec = { model: 'DocumentFile'|'Upload'; id: string; path: string; updatedAt: Date }
  const byPath = new Map<string, Rec[]>()
  for (const d of docs) {
    if (!d?.path) continue
    const arr = byPath.get(d.path) || []
    arr.push({ model: 'DocumentFile', id: d.id, path: d.path, updatedAt: new Date(d.updatedAt || d.createdAt || Date.now()) })
    byPath.set(d.path, arr)
  }
  for (const u of uploads) {
    if (!u?.path) continue
    const arr = byPath.get(u.path) || []
    arr.push({ model: 'Upload', id: u.id, path: u.path, updatedAt: new Date(u.updatedAt || u.createdAt || Date.now()) })
    byPath.set(u.path, arr)
  }

  for (const [path, arr] of byPath.entries()) {
    if (arr.length <= 1) continue
    // Prefer DocumentFile; if multiple, keep the newest updatedAt
    const preferred = arr
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .sort((a, b) => Number(b.model === 'DocumentFile') - Number(a.model === 'DocumentFile'))[0]
    // Delete all others
    for (const rec of arr) {
      if (rec.id === preferred.id && rec.model === preferred.model) { report.kept.push({ model: rec.model, id: rec.id, path: rec.path }); continue }
      if (rec.model === 'DocumentFile') {
        await (prisma as any).documentFile.delete({ where: { id: rec.id } }).catch(() => {})
      } else {
        await prisma.upload.delete({ where: { id: rec.id } }).catch(() => {})
      }
      report.deleted.push({ model: rec.model, id: rec.id, path: rec.path })
    }
  }

  // Advanced de-dupe by canonical base name (ignore extension/.gz). Prefer CSV > XML > TSV. Prefer .gz. Prefer DocumentFile.
  const allRecords: Rec[] = []
  for (const arr of byPath.values()) for (const rec of arr) allRecords.push(rec)
  const byBase = new Map<string, Rec[]>()
  for (const rec of allRecords) {
    const key = canonicalKey(rec.path)
    if (!key) continue
    const arr = byBase.get(key) || []
    arr.push(rec)
    byBase.set(key, arr)
  }
  for (const [key, arr] of byBase.entries()) {
    if (arr.length <= 1) continue
    const best = arr.sort((a, b) => score(b) - score(a))[0]
    for (const rec of arr) {
      if (rec.id === best.id && rec.model === best.model) { continue }
      if (rec.model === 'DocumentFile') {
        await (prisma as any).documentFile.delete({ where: { id: rec.id } }).catch(() => {})
      } else {
        await prisma.upload.delete({ where: { id: rec.id } }).catch(() => {})
      }
      report.deleted.push({ model: rec.model, id: rec.id, path: rec.path })
    }
    report.kept.push({ model: best.model, id: best.id, path: best.path })
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2))
}

function canonicalKey(url: string): string | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const file = parts.pop() || ''
    const dir = parts.join('/')
    const noGz = file.replace(/\.gz$/i, '')
    const base = noGz.replace(/\.(csv|xml|tsv)$/i, '')
    return `${u.host}${dir}/${base}`
  } catch { return null }
}

function score(rec: { path: string; model: string; updatedAt: Date }): number {
  let s = 0
  // Prefer DocumentFile
  s += rec.model === 'DocumentFile' ? 1000 : 0
  // Prefer newer
  s += rec.updatedAt.getTime() / 1e6
  // Extension preference: CSV > XML > TSV
  const p = rec.path.toLowerCase()
  if (/\.csv(\.gz)?$/i.test(p)) s += 500
  else if (/\.xml(\.gz)?$/i.test(p)) s += 400
  else if (/\.tsv(\.gz)?$/i.test(p)) s += 300
  // Prefer .gz
  if (/\.gz$/i.test(p)) s += 50
  return s
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())
