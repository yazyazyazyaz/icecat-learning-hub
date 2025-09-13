"use server"

import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import path from 'path'
import { promises as fs } from 'fs'

export async function createDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')

  const title = String(formData.get('title') || '').trim()
  let filePath = String(formData.get('path') || '').trim()
  let tags = (formData.getAll('tags') || []).map(String)
  const noteRaw = String(formData.get('note') || '').trim()
  if (noteRaw) {
    // Remove any prior note: entries from provided tags
    tags = tags.filter(t => !t.startsWith('note:'))
    tags.push(`note:${encodeURIComponent(noteRaw)}`)
  }
  const file = formData.get('file') as any as File | null

  if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
    const bytes = Buffer.from(await (file as File).arrayBuffer())
    const ext = path.extname((file as any).name || '') || '.bin'
    const safeName = (file as any).name?.replace(/[^a-zA-Z0-9._-]/g, '_') || `document${ext}`
    const dir = path.join(process.cwd(), 'public', 'uploads', 'files')
    await fs.mkdir(dir, { recursive: true })
    const fileName = `${Date.now()}_${safeName}`
    const abs = path.join(dir, fileName)
    await fs.writeFile(abs, bytes)
    filePath = `/uploads/files/${fileName}`
  }

  if (!title || !filePath) throw new Error('Missing fields')

  try {
    await (db as any).documentFile.create({ data: { title, path: filePath, tags } })
  } catch {
    // Fallback to legacy uploads as DOCUMENT if migration not applied
    await db.upload.create({ data: { title, path: filePath, tags, kind: 'DOCUMENT' as any } })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
}

export async function updateDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const id = String(formData.get('id') || '')
  const title = String(formData.get('title') || '').trim()
  const pathVal = String(formData.get('path') || '').trim()
  const tagsInput = (formData.getAll('tags') || []).map(String)
  const noteRaw = String(formData.get('note') || '').trim()
  if (!id) throw new Error('Missing id')
  // Compute tags to update only if tagsInput provided or noteRaw present
  let setTags: string[] | undefined
  if (tagsInput.length > 0 || formData.has && (formData as any).has('note') || noteRaw) {
    // Load current tags
    let current: string[] = []
    try {
      const rec: any = await (db as any).documentFile.findUnique({ where: { id }, select: { tags: true } })
      current = rec?.tags || []
    } catch {
      try {
        const rec: any = await db.upload.findUnique({ where: { id }, select: { tags: true } as any })
        current = rec?.tags || []
      } catch {}
    }
    const base = tagsInput.length > 0 ? tagsInput : current
    const withoutNote = base.filter(t => !t.startsWith('note:'))
    setTags = [...withoutNote]
    if (noteRaw) setTags.push(`note:${encodeURIComponent(noteRaw)}`)
  }
  const data: any = { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) }
  if (setTags) data.tags = setTags
  try {
    await (db as any).documentFile.update({ where: { id }, data })
  } catch {
    await db.upload.update({ where: { id }, data })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
}
