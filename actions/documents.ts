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
  const description = String(formData.get('description') || '').trim()
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
    const tagsWithDesc = description ? [...tags.filter((t) => !String(t).startsWith('desc:')), `desc:${description}`] : tags
    await (db as any).documentFile.create({ data: { title, path: filePath, tags: tagsWithDesc } })
  } catch {
    // Fallback to legacy uploads as DOCUMENT if migration not applied
    await db.upload.create({ data: { title, path: filePath, tags, kind: 'DOCUMENT' as any }, select: { id: true } })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
  revalidatePath('/editor/integration')
  revalidatePath('/integration')
}

export async function updateDocument(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error('Unauthorized')
  const id = String(formData.get('id') || '')
  const title = String(formData.get('title') || '').trim()
  const pathVal = String(formData.get('path') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const tagsSent = String(formData.get('tags__sent') || '').trim() !== ''
  const submittedTags = (formData.getAll('tags') || []).map(String)
  if (!id) throw new Error('Missing id')
  try {
    const current = await (db as any).documentFile.findUnique({ where: { id } })
    if (current) {
      let newTags: string[] | undefined = Array.isArray(current.tags as any) ? ((current.tags as any) as string[]) : []
      if (tagsSent) {
        // remove group/scope tags and reapply from submitted
        newTags = newTags.filter((t) => t !== 'Index File' && t !== 'Reference File' && !String(t).startsWith('refscope:'))
        newTags.push(...submittedTags)
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
      let tags = Array.isArray(existing?.tags) ? (existing!.tags as string[]) : []
      if (tagsSent) {
        tags = tags.filter((t) => t !== 'Index File' && t !== 'Reference File' && !String(t).startsWith('refscope:'))
        tags.push(...submittedTags)
      }
      await db.upload.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) , ...(tagsSent?{tags}:{}) }, select: { id: true } })
  }
  } catch {
    await db.upload.update({ where: { id }, data: { ...(title?{title}:{}) , ...(pathVal?{path:pathVal}:{}) , ...(tagsSent?{tags: submittedTags}:{}) }, select: { id: true } })
  }
  revalidatePath('/documents')
  revalidatePath('/admin/documents')
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
