"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import path from 'path'
import { promises as fs } from 'fs'
import { revalidatePath } from 'next/cache'

const schema = z.object({
  title: z.string().min(2),
  path: z.string().min(2),
  tags: z.array(z.string()).default([]),
  kind: z.enum(["PRESENTATION", "DOCUMENT"]),
})

export async function createUpload(formData: FormData | unknown) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  let data: z.infer<typeof schema>
  if (formData instanceof FormData) {
    const title = String(formData.get('title') || '')
    let tags: string[] = (formData.getAll('tags') || []).map(String)
    const kind = String(formData.get('kind') || 'DOCUMENT') as 'DOCUMENT' | 'PRESENTATION'
    let filePath = String(formData.get('path') || '')
    const file = formData.get('file') as unknown as File | null
    // Optional use case support for manuals/documents
    const uc = String(formData.get('usecase') || '').trim()
    // No custom support: ignore any auxiliary inputs and treat 'custom' as none
    const ucFinal = uc === 'custom' ? '' : uc
    // Add manual tag only if explicitly flagged via isManual hidden field or tag already included
    const isManualFlag = String(formData.get('isManual') || '').trim() !== ''
    if (isManualFlag && !tags.includes('manual')) tags.push('manual')
    if (ucFinal) {
      // remove any existing usecase:* tag, then add the new one
      const cleaned = tags.filter((t) => !t.startsWith('usecase:'))
      cleaned.push(`usecase:${ucFinal}`)
      tags = cleaned
    }
    if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
      const bytes = Buffer.from(await (file as File).arrayBuffer())
      const ext = path.extname((file as any).name || '') || '.bin'
      const safeName = (file as any).name?.replace(/[^a-zA-Z0-9._-]/g, '_') || `upload${ext}`
      const targetFolder = kind === 'PRESENTATION' ? 'presentations' : (isManualFlag ? 'manuals' : 'documents')
      const dir = path.join(process.cwd(), 'public', 'uploads', targetFolder)
      await fs.mkdir(dir, { recursive: true })
      const fileName = `${Date.now()}_${safeName}`
      const abs = path.join(dir, fileName)
      await fs.writeFile(abs, bytes)
      filePath = `/uploads/${targetFolder}/${fileName}`
    }
    data = schema.parse({ title, path: filePath, tags, kind })
  } else {
    data = schema.parse(formData as any)
  }
  const safeData: any = { ...data, kind: (data as any).kind as any }
  delete safeData.useCase
  try {
    await db.upload.create({ data: safeData, select: { id: true } })
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase()
    if (msg.includes('usecase') || msg.includes('upload.usecase') || msg.includes('does not exist')) {
      await db.upload.create({ data: safeData, select: { id: true } })
    } else {
      throw e
    }
  }
  revalidatePath('/files')
  revalidatePath('/manuals')
  revalidatePath('/admin/manuals')
  return { ok: true }
}

const updateSchema = z.object({
  id: z.string().cuid(),
  title: z.string().optional(),
  path: z.string().optional(),
  usecase: z.string().optional(),
  usecase_new: z.string().optional(),
})

export async function updateUpload(formData: FormData | unknown) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  const raw = formData instanceof FormData
    ? {
        id: String(formData.get('id') || ''),
        title: String(formData.get('title') || ''),
        path: String(formData.get('path') || ''),
        usecase: String(formData.get('usecase') || ''),
      }
    : (formData as any)
  const parsed = updateSchema.parse(raw)
  const ucFinal = parsed.usecase === 'custom' ? '' : (parsed.usecase || '')
  const data: any = {}
  if (parsed.title) data.title = parsed.title
  if (parsed.path) data.path = parsed.path
  // Do not set useCase column; keep value encoded in tags only
  // Maintain tags: preserve existing manual tag only if present; replace any usecase:* tag
  const existing = await db.upload.findUnique({ where: { id: parsed.id }, select: { tags: true } })
  let tags = existing?.tags ?? []
  const hasManual = tags.includes('manual')
  tags = tags.filter((t) => !t.startsWith('usecase:'))
  if (ucFinal) tags.push(`usecase:${ucFinal}`)
  if (hasManual && !tags.includes('manual')) tags.push('manual')
  data.tags = tags
  try {
    await db.upload.update({ where: { id: parsed.id }, data, select: { id: true } })
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase()
    if (msg.includes('usecase') || msg.includes('upload.usecase') || msg.includes('does not exist')) {
      const { useCase, ...rest } = data
      await db.upload.update({ where: { id: parsed.id }, data: rest, select: { id: true } })
    } else {
      throw e
    }
  }
  revalidatePath('/manuals')
  revalidatePath('/admin/manuals')
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  return { ok: true }
}

export async function deleteUpload(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")
  if (!id) throw new Error('Missing id')
  await db.upload.delete({ where: { id }, select: { id: true } })
  revalidatePath('/manuals')
  revalidatePath('/admin/manuals')
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  revalidatePath('/editor/manuals')
  return { ok: true }
}

// Bulk import manuals from a newline-separated list of URLs.
export async function importManualsFromUrls(formData: FormData | unknown) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const raw = formData instanceof FormData
    ? String(formData.get('urls') || '')
    : String((formData as any)?.urls || '')
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const results: Array<{ url: string; id?: string; skipped?: boolean; error?: string }> = []
  for (const url of lines) {
    try {
      // Skip if already exists by exact path
      const existing = await db.upload.findFirst({ where: { path: url, kind: 'DOCUMENT' as any } as any, select: { id: true } })
      if (existing) { results.push({ url, skipped: true }); continue }
      // Fetch and infer title
      let title = url
      try {
        const res = await fetch(url, { method: 'GET' })
        const html = await res.text()
        const og = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)/i.exec(html) || /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html)
        const t = og?.[1] || /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ''
        const cleaned = t.replace(/\s*[|\u2013\u2014\-]\s*Iceclog.*$/i, '').replace(/\s*[|\u2013\u2014\-]\s*Icecat.*$/i, '').trim()
        if (cleaned) title = cleaned
      } catch {}
      const rec = await db.upload.create({ data: { title, path: url, tags: ['manual'], kind: 'DOCUMENT' as any }, select: { id: true } })
      results.push({ url, id: rec.id })
    } catch (e: any) {
      results.push({ url, error: String(e?.message || 'Failed') })
    }
  }
  revalidatePath('/editor/manuals')
  revalidatePath('/manuals')
  revalidatePath('/admin/manuals')
  return { ok: true, results }
}
