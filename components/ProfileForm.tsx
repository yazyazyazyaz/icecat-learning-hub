"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
// Prefer API route for maximum reliability across Prisma schema drift
import { Hourglass } from "lucide-react"

export default function ProfileForm({ user }: { user: any }) {
  const router = useRouter()
  const [saved, setSaved] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const [appKey, setAppKey] = useState<string>(user?.appKey || '')
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaved(null); setErr(null)
    const fd = new FormData(e.currentTarget)
    const payload = {
      jobFunction: String(fd.get('jobFunction') || '').trim(),
      appKey,
    }
    start(async () => {
      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        let data: any = null
        try { data = await res.json() } catch {}
        if (!res.ok) throw new Error(data?.error || 'Save failed')
        // Ensure server components re-fetch latest data
        try { router.refresh() } catch {}
        setSaved('Saved')
        setTimeout(()=>setSaved(null), 2500)
      } catch (e: any) {
        setErr(String(e?.message || 'Failed to save'))
      }
    })
  }
  return (
    <form onSubmit={onSubmit} autoComplete="off" className="grid gap-4 mt-4 max-w-3xl">
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm px-3 py-2">
          Changes saved.
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm px-3 py-2">
          {err}
        </div>
      )}
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input className="w-full px-3 py-2 border rounded-xl bg-neutral-100" autoComplete="off" value={user?.name || ''} disabled />
      </div>
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input className="w-full px-3 py-2 border rounded-xl bg-neutral-100" autoComplete="off" value={user?.email || ''} disabled />
      </div>
      <div>
        <label className="block text-sm mb-1">Function</label>
        <input name="jobFunction" defaultValue={user?.jobFunction || ''} className="w-full px-3 py-2 border rounded-xl bg-white" placeholder="e.g. Account Manager" />
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-medium">Credentials</h2>
        <p className="text-xs text-neutral-600 mt-0.5">Stored on your profile for reuse in Wizard (JSON mode).</p>
        <div className="grid md:grid-cols-1 gap-3 mt-3">
          <div>
            <label className="block text-sm mb-1">App Key (for JSON)</label>
            <input name="appKey" value={appKey} onChange={(e)=>setAppKey(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white" placeholder="Paste your App Key" />
          </div>
        </div>
      </div>
      <div className="mt-2">
        <button disabled={isPending} aria-busy={isPending} className="px-4 py-2 rounded-full border inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {isPending && <Hourglass className="w-4 h-4 animate-spin text-emerald-700 dark:text-sky-400" />} 
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}


