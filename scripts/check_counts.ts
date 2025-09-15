import { prisma } from "@/lib/db"

async function main() {
  const tables = [
    { key: 'upload', name: 'Uploads' },
    { key: 'presentation', name: 'Presentations' },
    { key: 'documentFile', name: 'DocumentFile' },
    { key: 'learningPath', name: 'LearningPath' },
    { key: 'learningTask', name: 'LearningTask' },
    { key: 'quiz', name: 'Quiz' },
    { key: 'question', name: 'Question' },
  ] as const
  for (const t of tables) {
    try {
      // @ts-ignore
      const c = await (prisma as any)[t.key].count()
      console.log(`${t.name}: ${c}`)
    } catch (e: any) {
      console.log(`${t.name}: ERR ${e?.message||'unknown error'}`)
    }
  }
  try {
    const env = process.env.DATABASE_URL || '(no DATABASE_URL)'
    console.log('DATABASE_URL:', env)
  } catch {}
}

main().finally(()=>process.exit(0))

