import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function main() {
  const weeks = [
    { slug: 'onboarding-week', title: 'Onboarding week', sortOrder: 0 },
    { slug: 'third-week', title: 'Third week', sortOrder: 1 },
    { slug: 'fourth-week', title: 'Fourth week', sortOrder: 2 },
  ]
  for (const w of weeks) {
    const path = await prisma.learningPath.upsert({ where: { slug: w.slug }, update: { title: w.title, sortOrder: w.sortOrder }, create: w })
    for (let d=1; d<=5; d++) {
      const title = `Day ${d} — Intro & Practice`
      const programMd = `- Morning: Topic overview\n- Afternoon: Hands-on task #${d}`
      const noteMd = `Remember to ask questions and share findings.`
      const trainer = d % 2 ? 'Lana' : 'Sandra'
      const attachments = [ { name: 'Reference Manual', url: 'https://iceclog.com/manuals-csv-interface/' } ]
      const existing = await prisma.learningTask.findFirst({ where: { pathId: path.id, day: d, title } })
      if (!existing) {
        await prisma.learningTask.create({ data: { pathId: path.id, day: d, title, programMd, noteMd, trainer, attachments, position: d } })
      }
    }
  }
  console.log('Seeded dummy learning paths and days.')
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

