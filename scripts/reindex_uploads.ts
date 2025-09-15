import { PrismaClient, Audience } from '@prisma/client'
import path from 'path'
import { promises as fs } from 'fs'

const prisma = new PrismaClient()

async function ensureDirRecords(base: string, sub: string) {
  const dir = path.join(process.cwd(), 'public', 'uploads', sub)
  try {
    const entries = await fs.readdir(dir)
    for (const name of entries) {
      const full = path.join(dir, name)
      const stat = await fs.stat(full)
      if (!stat.isFile()) continue
      const rel = `/uploads/${sub}/${name}`.replace(/\\/g,'/')
      if (sub === 'presentations') {
        const title = name.replace(/[_-]+/g, ' ')
        // Upsert Presentation row
        const found = await prisma.presentation.findFirst({ where: { path: rel } })
        if (!found) {
          await prisma.presentation.create({ data: { title, path: rel, audience: 'RETAILERS' as Audience, tags: [] } as any })
        }
      } else if (sub === 'documents' || sub === 'files') {
        const title = name.replace(/[_-]+/g, ' ')
        const anyClient: any = prisma as any
        const existing = await anyClient.documentFile.findFirst({ where: { path: rel } })
        if (existing) {
          await anyClient.documentFile.update({ where: { id: existing.id }, data: { title } })
        } else {
          await anyClient.documentFile.create({ data: { title, path: rel, tags: [] } })
        }
      } else if (sub === 'manuals') {
        const title = name.replace(/[_-]+/g, ' ')
        // Recreate as Upload with tag 'manual'
        const found = await prisma.upload.findFirst({ where: { path: rel, kind: 'DOCUMENT' as any } })
        if (!found) {
          await prisma.upload.create({ data: { title, path: rel, tags: ['manual'], kind: 'DOCUMENT' as any } })
        }
      }
    }
  } catch (e) {
    // ignore if folder missing
  }
}

async function main() {
  await ensureDirRecords('public/uploads', 'presentations')
  await ensureDirRecords('public/uploads', 'documents')
  console.log('Reindex complete.')
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())
