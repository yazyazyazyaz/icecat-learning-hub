import { prisma } from "@/lib/db"

async function upsertWeek(slug: string, title: string, sortOrder: number) {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(
    `INSERT INTO "LearningPath" ("id","slug","title","sortOrder","createdAt","updatedAt")
     VALUES ((SELECT md5(random()::text || clock_timestamp()::text)), $1,$2,$3, NOW(), NOW())
     ON CONFLICT ("slug") DO UPDATE SET "title"=EXCLUDED."title", "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=NOW()
     RETURNING *`, slug, title, sortOrder)
  return rows[0]
}

async function upsertTask(pathId: string, day: number|null, title: string, program: string, note: string, trainer: string, attachments: any, position: number) {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(
    `INSERT INTO "LearningTask" ("id","pathId","day","title","programMd","noteMd","trainer","attachments","position","createdAt","updatedAt")
     VALUES ((SELECT md5(random()::text || clock_timestamp()::text)),$1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),NOW())
     ON CONFLICT ("pathId","day","title") DO UPDATE SET
       "programMd"=EXCLUDED."programMd",
       "noteMd"=EXCLUDED."noteMd",
       "trainer"=EXCLUDED."trainer",
       "attachments"=EXCLUDED."attachments",
       "position"=EXCLUDED."position",
       "updatedAt"=NOW()
     RETURNING *`, pathId, day, title, program, note, trainer, JSON.stringify(attachments), position)
  return rows[0]
}

async function main() {
  const weeks = [
    { slug: 'onboarding-week', title: 'Onboarding week', sortOrder: 0 },
    { slug: 'third-week', title: 'Third week', sortOrder: 1 },
    { slug: 'fourth-week', title: 'Fourth week', sortOrder: 2 },
  ]

  for (const w of weeks) {
    const wp = await upsertWeek(w.slug, w.title, w.sortOrder)
    for (let d=1; d<=5; d++) {
      const title = `Day ${d} — Kickoff & Practice`
      const program = `- Morning: Topic overview\n- Afternoon: Hands-on task #${d}`
      const note = `Remember to ask questions and share findings.`
      const trainer = d % 2 ? 'Lana' : 'Sandra'
      const attachments = [ { name: 'Reference Manual', url: 'https://iceclog.com/manuals-csv-interface/' } ]
      await upsertTask(wp.id, d, title, program, note, trainer, attachments, d)
    }
  }
  console.log('Dummy learning paths seeded (raw).')
}

main().catch((e)=>{ console.error(e); process.exit(1) })
