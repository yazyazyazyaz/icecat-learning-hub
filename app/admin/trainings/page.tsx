"use client"
import { useState, useTransition } from 'react'
import { createTraining } from '@/actions/admin'

export default function AdminTrainingsPage() {
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [isPending, start] = useTransition()
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Trainings</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            await createTraining({ slug, title, summary, tags: [] })
            setSlug(''); setTitle(''); setSummary('')
          })
        }}
        className="rounded-lg border p-4 grid gap-2"
      >
        <div>
          <label className="block text-sm">Slug</label>
          <input className="w-full rounded-md border px-3 py-2" value={slug} onChange={(e)=>setSlug(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Title</label>
          <input className="w-full rounded-md border px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Summary</label>
          <textarea className="w-full rounded-md border px-3 py-2" value={summary} onChange={(e)=>setSummary(e.target.value)} />
        </div>
        <button disabled={isPending} className="rounded-md bg-brand-600 px-4 py-2 text-white hover:bg-brand-700 disabled:opacity-50">Create</button>
      </form>
      <p className="text-sm text-gray-500">This is a minimal admin stub. Expand with tables & dialogs later.</p>
    </div>
  )
}

