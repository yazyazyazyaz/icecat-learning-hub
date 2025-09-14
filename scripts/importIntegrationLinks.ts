import { db } from "@/lib/db"

type Entry = { title: string; path: string; scope: "open" | "full" }

const ENTRIES: Entry[] = [
  {
    title: "Index file – Full Icecat",
    path: "https://data.icecat.biz/export/level4/EN/files.index.xml.gz",
    scope: "full",
  },
  {
    title: "Index file – Open Icecat",
    path: "http://data.Icecat.biz/export/freexml/EN/files.index.xml",
    scope: "open",
  },
  {
    title: "Daily index file – Full Icecat",
    path: "https://data.icecat.biz/export/level4/EN/daily.index.xml.gz",
    scope: "full",
  },
  {
    title: "Daily index file – Open Icecat",
    path: "https://data.Icecat.biz/export/freexml/EN/daily.index.xml.gz",
    scope: "open",
  },
]

function mergeTags(existing: string[] | null | undefined, scope: Entry["scope"]) {
  const set = new Set<string>(Array.isArray(existing) ? existing : [])
  // Ensure group tag
  set.add("Index File")
  // Normalize refscope
  set.delete("refscope:open")
  set.delete("refscope:full")
  set.add(scope === "full" ? "refscope:full" : "refscope:open")
  // Add source tag
  if (scope === "full") set.add("level4")
  if (scope === "open") set.add("freexml")
  return Array.from(set)
}

async function upsertDocumentFile(e: Entry) {
  const found = await (db as any).documentFile.findFirst({ where: { path: e.path } })
  if (found) {
    const tags = mergeTags(found.tags as any, e.scope)
    await (db as any).documentFile.update({ where: { id: found.id }, data: { title: e.title, tags } })
    return { id: found.id, model: "DocumentFile", action: "updated" as const }
  }
  const created = await (db as any).documentFile.create({ data: { title: e.title, path: e.path, tags: mergeTags([], e.scope) } })
  return { id: created.id, model: "DocumentFile", action: "created" as const }
}

async function upsertUpload(e: Entry) {
  const found = await db.upload.findFirst({ where: { path: e.path, kind: "DOCUMENT" as any } })
  if (found) {
    const tags = mergeTags(found.tags as any, e.scope)
    await db.upload.update({ where: { id: found.id }, data: { title: e.title, tags } })
    return { id: found.id, model: "Upload", action: "updated" as const }
  }
  const created = await db.upload.create({ data: { title: e.title, path: e.path, tags: mergeTags([], e.scope), kind: "DOCUMENT" as any }, select: { id: true } })
  return { id: created.id, model: "Upload", action: "created" as const }
}

async function main() {
  const results: any[] = []
  try {
    // Try DocumentFile first
    for (const e of ENTRIES) {
      // Probe if the table exists by a safe query per item
      const r = await upsertDocumentFile(e)
      results.push(r)
    }
  } catch (err) {
    // Fallback to legacy Upload model
    for (const e of ENTRIES) {
      const r = await upsertUpload(e)
      results.push(r)
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, results }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    try { await (db as any).$disconnect?.() } catch {}
  })
