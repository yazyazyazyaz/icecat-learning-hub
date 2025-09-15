import { prisma } from "@/lib/db"

async function main() {
  const client: any = prisma as any
  try {
    if (client.learningTask) {
      await client.learningTask.updateMany({ data: { attachments: [] } })
    } else {
      await client.$executeRawUnsafe(`UPDATE "LearningTask" SET "attachments"='[]'::jsonb`)
    }
    console.log('Cleared attachments on all onboarding trainings.')
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    try { await (client as any).$disconnect?.() } catch {}
  }
}

main()

