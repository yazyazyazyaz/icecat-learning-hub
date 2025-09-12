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
  const tags = (formData.getAll('tags') || []).map(String)
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
  if (!id) throw new Error('Missing id')
  try {
    await (db as any).documentFile.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) } })
  } catch {
    await db.upload.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) } })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
}
