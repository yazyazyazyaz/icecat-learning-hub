"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import path from 'path'
import { promises as fs } from 'fs'

function safeUploadDir(...parts: string[]) {
  const base = process.env.VERCEL === '1' ? '/tmp' : path.join(process.cwd(), 'public', 'uploads')
  return path.join(base, ...parts)
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

async function persistUploadedFile(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const original = (file as any)?.name || 'document.bin'
  const ext = path.extname(original) || '.bin'
  const safeName = original.replace(/[^a-zA-Z0-9._-]/g, '_') || `document${ext}`
  const dir = safeUploadDir('files')
  await fs.mkdir(dir, { recursive: true })
  const fileName = `${Date.now()}_${safeName}`
  const abs = path.join(dir, fileName)
  await fs.writeFile(abs, bytes)
  if (dir.startsWith('/tmp')) {
    const mime = guessMimeType(ext)
    return `data:${mime};base64,${bytes.toString('base64')}`
  }
  return `/uploads/files/${fileName}`
}

export async function createDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') || '').trim()
  let filePath = String(formData.get('path') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const rawTags = (formData.getAll('tags') || []).map(String)
  const chosenTag = String(formData.get('tag') || '').trim()
  const file = formData.get('file') as any as File | null

  if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
    filePath = await persistUploadedFile(file as File)
  }

  if (!title || !filePath) throw new Error('Missing fields')

  const INTEGRATION_TAGS = new Set(['Index File','Reference File','refscope:open','refscope:full'])
  const DOC_TAGS = new Set(['Contracts','Various documents','Internal documents'])
  function buildTags(base: string[], opts?: { includeIntegration?: boolean }): string[] {
    const includeIntegration = Boolean(opts?.includeIntegration)
    const next = new Set<string>()
    const integration: string[] = []
    let docTag = chosenTag || ''
    for (const raw of base || []) {
      const tag = String(raw || '')
      if (!tag || tag.startsWith('desc:')) continue
      if (INTEGRATION_TAGS.has(tag)) {
        if (includeIntegration) integration.push(tag)
        continue
      }
      if (DOC_TAGS.has(tag)) {
        if (!docTag) docTag = tag
        continue
      }
      next.add(tag)
    }
    if (docTag) next.add(docTag)
    if (includeIntegration) {
      for (const tag of integration) next.add(tag)
    }
    if (description) next.add(`desc:${description}`)
    return Array.from(next)
  }
  const tagsWithDesc = buildTags(rawTags, { includeIntegration: true })
  // If a document with same path exists, update it instead of creating duplicate
  try {
    const existing = await (db as any).documentFile.findFirst({ where: { path: filePath } })
    if (existing) {
      // Merge tags (preserve existing non-desc tags, replace desc)
      let newTags: string[] = Array.isArray(existing.tags as any) ? ((existing.tags as any) as string[]) : []
      // remove desc and any integration tags that would incorrectly route to Integration Files
      newTags = buildTags(newTags, { includeIntegration: true })
      await (db as any).documentFile.update({ where: { id: existing.id }, data: { title, path: filePath, tags: newTags } })
    } else {
      await (db as any).documentFile.create({ data: { title, path: filePath, tags: tagsWithDesc } })
    }
  } catch {
    // Fallback to legacy uploads as DOCUMENT if migration not applied
    try {
      const existing = await db.upload.findFirst({ where: { kind: 'DOCUMENT' as any, path: filePath } })
      if (existing) {
        let newTags: string[] = Array.isArray(existing.tags) ? (existing.tags as string[]) : []
        newTags = buildTags(newTags, { includeIntegration: true })
        await db.upload.update({ where: { id: existing.id }, data: { title, path: filePath, tags: newTags } })
      } else {
        await db.upload.create({ data: { title, path: filePath, tags: tagsWithDesc, kind: 'DOCUMENT' as any }, select: { id: true } })
      }
    } catch {}
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  revalidatePath('/editor/documents')
  revalidatePath('/editor/integration')
  revalidatePath('/integration')
}

export async function updateDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const id = String(formData.get('id') || '')
  const title = String(formData.get('title') || '').trim()
  let pathVal = String(formData.get('path') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const tagsSent = String(formData.get('tags__sent') || '').trim() !== ''
  const submittedTags = (formData.getAll('tags') || []).map(String)
  const file = formData.get('file') as any as File | null
  if (!id) throw new Error('Missing id')
  try {
    const current = await (db as any).documentFile.findUnique({ where: { id } })
    if (current) {
      if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
        pathVal = await persistUploadedFile(file as File)
      }
      const INTEGRATION_TAGS = new Set(['Index File','Reference File','refscope:open','refscope:full'])
      const DOC_TAGS = new Set(['Contracts','Various documents','Internal documents'])
      let newTags: string[] | undefined = Array.isArray(current.tags as any) ? ((current.tags as any) as string[]) : []
      if (tagsSent) {
        const integrationSelected = submittedTags.filter((x) => INTEGRATION_TAGS.has(String(x)))
        // remove integration/doc tags and reapply single doc tag
        newTags = newTags.filter((t) => !String(t).startsWith('desc:') && !DOC_TAGS.has(String(t)) && (integrationSelected.length ? !INTEGRATION_TAGS.has(String(t)) : true))
        const doc = String(formData.get('tag') || '').trim() || submittedTags.find((x) => DOC_TAGS.has(String(x))) || ''
        if (doc) newTags.push(doc)
        if (integrationSelected.length) {
          const seen = new Set(newTags)
          for (const tag of integrationSelected) {
            const val = String(tag)
            if (val && !seen.has(val)) {
              newTags.push(val)
              seen.add(val)
            }
          }
        }
      }
      if (description) {
        newTags = newTags.filter((t) => !String(t).startsWith('desc:'))
        newTags.push(`desc:${description}`)
      } else {
        newTags = newTags.filter((t) => !String(t).startsWith('desc:'))
      }
      await (db as any).documentFile.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) , ...(newTags?{tags:newTags}:{}) } })
    } else {
      // legacy upload path
        const existing = await db.upload.findUnique({ where: { id }, select: { tags: true } })
        const INTEGRATION_TAGS2 = new Set(['Index File','Reference File','refscope:open','refscope:full'])
        const DOC_TAGS2 = new Set(['Contracts','Various documents','Internal documents'])
        let tags = Array.isArray(existing?.tags) ? (existing!.tags as string[]) : []
        if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
          pathVal = await persistUploadedFile(file as File)
        }
        if (tagsSent) {
          const integrationSelected = submittedTags.filter((x) => INTEGRATION_TAGS2.has(String(x)))
          tags = tags.filter((t) => !String(t).startsWith('desc:') && !DOC_TAGS2.has(String(t)) && (integrationSelected.length ? !INTEGRATION_TAGS2.has(String(t)) : true))
          const doc = String(formData.get('tag') || '').trim() || submittedTags.find((x) => DOC_TAGS2.has(String(x))) || ''
          if (doc) tags.push(doc)
          if (integrationSelected.length) {
            const seen = new Set(tags)
            for (const tag of integrationSelected) {
              const val = String(tag)
              if (val && !seen.has(val)) {
                tags.push(val)
                seen.add(val)
              }
            }
          }
        }
      await db.upload.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) , ...(tagsSent?{tags}:{}) }, select: { id: true } })
  }
  } catch {
    await db.upload.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) , ...(tagsSent?{tags: submittedTags}:{}) }, select: { id: true } })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  revalidatePath('/editor/documents')
  revalidatePath('/editor/integration')
  revalidatePath('/integration')
}

export async function moveToIntegration(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const id = String(formData.get('id') || '')
  const group = String(formData.get('group') || '') // 'Index File' | 'Reference File'
  const scope = String(formData.get('scope') || '') // 'open' | 'full'
  if (!id || (group !== 'Index File' && group !== 'Reference File')) throw new Error('Missing or invalid fields')

  // Helper to compute new tags
  function calcTags(prev: string[] | null | undefined) {
    const set = new Set<string>(Array.isArray(prev) ? prev : [])
    // Remove document-only tags that are not relevant
    set.delete('Contracts');
    set.delete('Various documents');
    // Remove any previous refscope tags
    set.delete('refscope:open');
    set.delete('refscope:full');
    // Add integration tags
    set.add(group)
    if (group === 'Reference File') {
      set.add(scope === 'full' ? 'refscope:full' : 'refscope:open')
    }
    return Array.from(set)
  }

  try {
    // Try DocumentFile first
    const cur = await (db as any).documentFile.findUnique({ where: { id } })
    if (cur) {
      const tags = calcTags(cur.tags as any)
      await (db as any).documentFile.update({ where: { id }, data: { tags } })
    } else {
      // Fallback to legacy Upload
      const up = await db.upload.findUnique({ where: { id } })
      if (!up) throw new Error('Not found')
      const tags = calcTags(up.tags as any)
      await db.upload.update({ where: { id }, data: { tags } })
    }
  } catch (e) {
    throw e
  }

  revalidatePath('/editor/integration')
  revalidatePath('/integration')
  revalidatePath('/editor/documents')
  revalidatePath('/documents')
}

export async function deleteDocument(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  if (!id) throw new Error('Missing id')
  try {
    await (db as any).documentFile.delete({ where: { id } })
  } catch {
    try { await db.upload.delete({ where: { id }, select: { id: true } }) } catch {}
  }
  revalidatePath('/editor/integration')
  revalidatePath('/integration')
  revalidatePath('/editor/documents')
  revalidatePath('/documents')
}

// Bulk import documents from pasted CSV (Name,Links,Assignee,Attachment,Detail,Last modification)
export async function importDocumentsFromCSV(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const csv = String(formData.get('csv') || '').trim()
  const defaultTag = String(formData.get('defaultTag') || 'Various documents')
  if (!csv) return { ok: false, message: 'No data' }

  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  // Drop header if present (starts with Name,Links,...)
  const dataLines = lines[0].toLowerCase().startsWith('name,') ? lines.slice(1) : lines

  function parseLine(line: string): string[] {
    // Minimal CSV splitter: respects quoted segments
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (ch === ',' && !inQuotes) { out.push(cur); cur = ''; continue }
      cur += ch
    }
    out.push(cur)
    while (out.length < 6) out.push('')
    return out.slice(0, 6).map((s) => s.trim())
  }

  function extractAttachmentUrl(s: string): string | null {
    // e.g. "File Name (https://...)" -> https URL
    const m = s.match(/\((https?:[^)]+)\)/i)
    return m ? m[1] : null
  }

  const created: Array<{ title: string; path: string }> = []
  for (const raw of dataLines) {
    try {
      const [name, link, assignee, attachment, detail] = parseLine(raw)
      const title = (name || '').trim()
      const pathVal = (link || extractAttachmentUrl(attachment) || '').trim()
      if (!title || !pathVal) continue
      const tagsBase: string[] = []
      if (defaultTag) tagsBase.push(defaultTag)
      if (assignee) tagsBase.push(assignee)
      const tags = detail ? [...tagsBase, `desc:${detail}`] : tagsBase
      try {
        await (db as any).documentFile.create({ data: { title, path: pathVal, tags } })
      } catch {
        await db.upload.create({ data: { title, path: pathVal, tags, kind: 'DOCUMENT' as any }, select: { id: true } })
      }
      created.push({ title, path: pathVal })
    } catch {
      // skip malformed line
    }
  }

  revalidatePath('/documents')
  revalidatePath('/editor/documents')
  return { ok: true, created: created.length }
}
