/* scripts/export_repo_content.ts
   Exports selected DB content into versioned JSON files under data/seed/ so
   it can be tracked in Git and imported on deploy.
*/
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function writeJson(rel: string, data: any) {
  const outPath = path.join(process.cwd(), 'data', 'seed', rel)
  await ensureDir(path.dirname(outPath))
  await fs.writeFile(outPath, JSON.stringify(data, null, 2), 'utf8')
  console.log('Wrote', rel)
}

async function main() {
  const uploads = await prisma.upload.findMany({ select: { title: true, path: true, tags: true, kind: true } })
  const presentations = await prisma.presentation.findMany({ select: { title: true, description: true, path: true, audience: true, tags: true } })
  const documents = await prisma.documentFile.findMany({ select: { title: true, path: true, tags: true } })
  const trainings = await prisma.training.findMany({
    select: {
      slug: true, title: true, summary: true, isMandatory: true, durationMinutes: true, tags: true,
      modules: {
        select: {
          title: true, order: true,
          lessons: { select: { title: true, slug: true, bodyMdx: true, externalUrl: true, order: true } }
        }, orderBy: { order: 'asc' }
      },
      quizzes: { select: { title: true, description: true, timeLimitSeconds: true, passThreshold: true } },
    },
    orderBy: { createdAt: 'asc' }
  })

  // Learning paths/tasks (if present)
  let learningPaths: any[] = []
  try {
    // @ts-ignore
    learningPaths = await (prisma as any).learningPath.findMany({
      select: {
        slug: true, title: true, sortOrder: true,
        tasks: {
          select: { day: true, title: true, programMd: true, noteMd: true, trainer: true, attachments: true, position: true },
          orderBy: [{ day: 'asc' }, { position: 'asc' }]
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }]
    })
  } catch {}

  await writeJson('uploads.json', uploads)
  await writeJson('presentations.json', presentations)
  await writeJson('documents.json', documents)
  await writeJson('trainings.json', trainings)
  await writeJson('learningPaths.json', learningPaths)
}

main().catch((e) => { console.error(e); process.exit(1) })

