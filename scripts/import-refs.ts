/*
  Import Icecat Reference Files as link Documents with sub-scope tags.
  - Open Icecat (freexml):   tag "refscope:open"
  - Full Icecat (level4):    tag "refscope:full"
  Each record gets tags: ["Reference File", sub-scope].
*/

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Saved = { title: string; path: string; tags: string[] }

async function main() {
  const credsUser = process.env.ICECAT_REFS_USER || 'yagiztest'
  const credsPass = process.env.ICECAT_REFS_PASS || '00test00'
  const auth = 'Basic ' + Buffer.from(`${credsUser}:${credsPass}`).toString('base64')

  const bases = [
    { href: 'https://data.icecat.biz/export/freexml/refs/', tagScope: 'refscope:open' },
    { href: 'https://data.icecat.biz/export/level4/refs/', tagScope: 'refscope:full' },
  ] as const

  const results: { added: Saved[]; skipped: Saved[]; errors: string[] } = { added: [], skipped: [], errors: [] }

  for (const b of bases) {
    try {
      const html = await fetchTextAuth(b.href, auth)
      const links = extractLinks(html, b.href)
      const fileLinks = links.filter(l => /(\.csv|\.xml|\.tsv)(\.gz)?$/i.test(l.href))
      for (const link of fileLinks) {
        const title = humanizeFileTitle(link.href) || link.text || 'File'
        const tags = ['Reference File', b.tagScope]
        const exists = await findByPath(link.href)
        if (exists) { results.skipped.push({ title, path: link.href, tags }); continue }
        try { await createRecord({ title, path: link.href, tags }); results.added.push({ title, path: link.href, tags }) }
        catch (e: any) { results.errors.push(`${title}: ${e?.message || 'failed'}`) }
      }
    } catch (e: any) {
      results.errors.push(`${b.href}: ${e?.message || 'failed'}`)
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2))
}

async function fetchTextAuth(url: string, authorization: string) {
  const res = await fetch(url, { headers: { Authorization: authorization } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

function extractLinks(html: string, base: string) {
  const out: Array<{ href: string; text: string }> = []
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const hrefRaw = m[1]
    const text = stripTags(m[2] || '').trim()
    try {
      const href = new URL(hrefRaw, base).toString()
      out.push({ href, text })
    } catch {}
  }
  return out
}

function stripTags(s: string) { return s.replace(/<[^>]+>/g, '') }

function humanizeFileTitle(u: string): string {
  try {
    const name = new URL(u).pathname.split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const base = noGz.replace(/\.(csv|xml|tsv)$/i, '')
    let s = base
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Za-z])([0-9])/g, '$1 $2')
      .replace(/([0-9])([A-Za-z])/g, '$1 $2')
      .trim()
    s = s.split(' ').map(w => w ? (w[0].toUpperCase() + w.slice(1)) : w).join(' ')
    return s
  } catch { return '' }
}

async function findByPath(path: string) {
  try {
    return await (prisma as any).documentFile.findFirst({ where: { path } })
  } catch {
    return await prisma.upload.findFirst({ where: { path, kind: 'DOCUMENT' as any } })
  }
}

async function createRecord({ title, path, tags }: { title: string; path: string; tags: string[] }) {
  try {
    await (prisma as any).documentFile.create({ data: { title, path, tags } })
  } catch {
    await prisma.upload.create({ data: { title, path, tags, kind: 'DOCUMENT' as any } })
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => prisma.$disconnect())

