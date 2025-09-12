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
  useCase: z.string().optional(),
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
    const ucNew = String(formData.get('usecase_new') || '').trim()
    const ucFinal = uc === 'custom' ? ucNew : uc
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
    data = schema.parse({ title, path: filePath, tags, kind, useCase: ucFinal || undefined })
  } else {
    data = schema.parse(formData as any)
  }
  try {
    await db.upload.create({ data: { ...data, kind: data.kind as any } })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unknown') && msg.toLowerCase().includes('usecase')) {
      const { useCase, ...rest } = data as any
      await db.upload.create({ data: { ...rest, kind: data.kind as any } })
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
        usecase_new: String(formData.get('usecase_new') || ''),
      }
    : (formData as any)
  const parsed = updateSchema.parse(raw)
  const ucFinal = parsed.usecase === 'custom' ? (parsed.usecase_new || '') : (parsed.usecase || '')
  const data: any = {}
  if (parsed.title) data.title = parsed.title
  if (parsed.path) data.path = parsed.path
  data.useCase = ucFinal || null
  // Maintain tags: preserve existing manual tag only if present; replace any usecase:* tag
  const existing = await db.upload.findUnique({ where: { id: parsed.id }, select: { tags: true } })
  let tags = existing?.tags ?? []
  const hasManual = tags.includes('manual')
  tags = tags.filter((t) => !t.startsWith('usecase:'))
  if (ucFinal) tags.push(`usecase:${ucFinal}`)
  if (hasManual && !tags.includes('manual')) tags.push('manual')
  data.tags = tags
  try {
    await db.upload.update({ where: { id: parsed.id }, data })
  } catch (e: any) {
    const msg = String(e?.message || '')
    if (msg.includes('Unknown') && msg.toLowerCase().includes('usecase')) {
      const { useCase, ...rest } = data
      await db.upload.update({ where: { id: parsed.id }, data: rest })
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
