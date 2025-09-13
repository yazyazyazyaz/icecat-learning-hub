"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"

type Saved = { title: string; path: string; tags: string[] }

export async function syncRefsFromFrostKitty() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role as string | undefined
  if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) throw new Error('Forbidden')

  const base = 'https://frost-kitty.netlify.app/refs'
  const indexPages = await discoverChildPages(base)
  const results: { added: Saved[]; skipped: Saved[]; errors: string[] } = { added: [], skipped: [], errors: [] }

  for (const p of indexPages) {
    try {
      const pageHtml = await fetchText(p.href)
      const links = extractLinks(pageHtml, p.href)
      const tag = p.title.toLowerCase().includes('index') ? 'Index File' : 'Reference File'
      for (const link of links) {
        // Only consider http(s) links to files.
        if (!/^https?:/i.test(link.href)) continue
        const title = (link.text || filenameFromUrl(link.href) || 'File').trim()
        const fullTags = [tag]
        // Skip if already exists by path
        const exists = await findDocumentByPath(link.href)
        if (exists) {
          results.skipped.push({ title, path: link.href, tags: fullTags })
          continue
        }
        try {
          await createDocumentRecord({ title, path: link.href, tags: fullTags })
          results.added.push({ title, path: link.href, tags: fullTags })
        } catch (e: any) {
          results.errors.push(`${title}: ${e?.message || 'failed'}`)
        }
      }
    } catch (e: any) {
      results.errors.push(`${p.title}: ${e?.message || 'failed'}`)
    }
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  return results
}

async function discoverChildPages(refsUrl: string) {
  const html = await fetchText(refsUrl)
  const anchors = extractLinks(html, refsUrl)
  // Pick links that look like child pages for index/reference
  const wanted = anchors.filter(a => /index\s*files|reference\s*files/i.test(a.text || ''))
  // Fallback: if not found, include all /refs/* links
  const fallback = anchors.filter(a => a.href.startsWith('https://frost-kitty.netlify.app/refs/'))
  const arr = wanted.length ? wanted : fallback
  // De-dupe by href
  const seen = new Set<string>()
  const pages: Array<{ title: string; href: string }> = []
  for (const a of arr) {
    if (!seen.has(a.href)) { seen.add(a.href); pages.push({ title: a.text || a.href, href: a.href }) }
  }
  return pages
}

async function fetchText(url: string) {
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

function extractLinks(html: string, base: string) {
  const out: Array<{ href: string; text: string }> = []
  // crude anchor extraction
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
function filenameFromUrl(u: string) { try { const { pathname } = new URL(u); return pathname.split('/').pop() || '' } catch { return '' } }

async function findDocumentByPath(path: string) {
  try {
    return await (db as any).documentFile.findFirst({ where: { path } })
  } catch {
    return await db.upload.findFirst({ where: { path, kind: 'DOCUMENT' as any } })
  }
}

async function createDocumentRecord({ title, path, tags }: { title: string; path: string; tags: string[] }) {
  try {
    await (db as any).documentFile.create({ data: { title, path, tags } })
  } catch {
    await db.upload.create({ data: { title, path, tags, kind: 'DOCUMENT' as any } })
  }
}

