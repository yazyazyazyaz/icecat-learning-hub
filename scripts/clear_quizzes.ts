/* scripts/clear_quizzes.ts
   Deletes all quizzes and related questions.
*/
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const qCountBefore = await prisma.quiz.count()
  const quesCountBefore = await prisma.question.count()
  await prisma.question.deleteMany({})
  await prisma.quiz.deleteMany({})
  const qCountAfter = await prisma.quiz.count()
  const quesCountAfter = await prisma.question.count()
  console.log(`Quizzes: ${qCountBefore} -> ${qCountAfter}`)
  console.log(`Questions: ${quesCountBefore} -> ${quesCountAfter}`)
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

