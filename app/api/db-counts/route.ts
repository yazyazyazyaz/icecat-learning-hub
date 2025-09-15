export const runtime = 'nodejs'

import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const [users, trainings, lessons, quizzes, paths, tasks] = await Promise.all([
      prisma.user.count().catch(()=>0),
      prisma.training.count().catch(()=>0),
      prisma.lesson.count().catch(()=>0),
      prisma.quiz.count().catch(()=>0),
      (prisma as any).learningPath?.count?.() ?? (prisma as any).$queryRawUnsafe?.('select count(*)::int as c from "LearningPath"').then((r:any)=>Number(r?.[0]?.c||0)).catch(()=>0),
      (prisma as any).learningTask?.count?.() ?? (prisma as any).$queryRawUnsafe?.('select count(*)::int as c from "LearningTask"').then((r:any)=>Number(r?.[0]?.c||0)).catch(()=>0),
    ])
    return Response.json({ ok: true, users, trainings, lessons, quizzes, learningPaths: paths, learningTasks: tasks })
  } catch (e:any) {
    return Response.json({ ok: false, error: String(e?.message||'failed') }, { status: 500 })
  }
}

