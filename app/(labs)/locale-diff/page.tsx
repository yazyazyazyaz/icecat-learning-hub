"use client"

import { useState } from 'react'
import PageHeading from '@/components/PageHeading'

export default function LocaleDiffPage() {
  const [langA, setLangA] = useState('EN')
  const [langB, setLangB] = useState('NL')
  const [GTIN, setGTIN] = useState('0711719709695')
  const shopname = process.env.NEXT_PUBLIC_ICECAT_SHOPNAME || 'openicecat-live'
  const [dataA, setDataA] = useState<any>(null)
  const [dataB, setDataB] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true); setDataA(null); setDataB(null)
    const base = { shopname, GTIN, content: 'title,reasonstobuy,featuregroups' }
    try {
      const [ra, rb] = await Promise.all([
        fetch('/api/live', { method: 'POST', body: JSON.stringify({ ...base, lang: langA }) }).then(r=>r.json()),
        fetch('/api/live', { method: 'POST', body: JSON.stringify({ ...base, lang: langB }) }).then(r=>r.json()),
      ])
      setDataA(ra)
      setDataB(rb)
    } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeading title="Locale Diff" subtitle="Compare fields across two locales." accent="presentations" />
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">GTIN</label>
          <input value={GTIN} onChange={e=>setGTIN(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Lang A</label>
          <input value={langA} onChange={e=>setLangA(e.target.value.toUpperCase())} className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Lang B</label>
          <input value={langB} onChange={e=>setLangB(e.target.value.toUpperCase())} className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-4">
        <button onClick={run} disabled={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy?'Running…':'Run'}</button>
      </div>
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <DiffPane title={`Title (${langA})`} value={pickPath(dataA,'data.Title') || pickPath(dataA,'Title')} />
        <DiffPane title={`Title (${langB})`} value={pickPath(dataB,'data.Title') || pickPath(dataB,'Title')} />
        <DiffPane title={`Reasons (${langA})`} value={JSON.stringify(pickPath(dataA,'data.ReasonsToBuy')||[], null, 2)} />
        <DiffPane title={`Reasons (${langB})`} value={JSON.stringify(pickPath(dataB,'data.ReasonsToBuy')||[], null, 2)} />
      </div>
    </div>
  )
}

function DiffPane({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
      <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">{title}</div>
      <pre className="p-3 text-xs overflow-auto max-h-[50vh] whitespace-pre-wrap break-words">{value || ''}</pre>
    </section>
  )
}

function pickPath(obj: any, path: string): any {
  try { return path.split('.').reduce((a,k)=>a?.[k], obj) } catch { return undefined }
}

