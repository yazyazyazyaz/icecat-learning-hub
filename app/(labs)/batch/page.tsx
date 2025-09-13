"use client"

import { useMemo, useState } from 'react'
import PageHeading from '@/components/PageHeading'

export default function BatchPage() {
  const [lang, setLang] = useState('EN')
  const [ids, setIds] = useState('')
  const [content, setContent] = useState('essentialinfo,title')
  const [rows, setRows] = useState<Array<{ id: string; ok: boolean; status: number; body: string }>>([])
  const [busy, setBusy] = useState(false)

  const gtins = useMemo(() => ids.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean), [ids])
  const shopname = process.env.NEXT_PUBLIC_ICECAT_SHOPNAME || 'openicecat-live'

  async function run() {
    setBusy(true)
    setRows([])
    const body = { gtins, lang, shopname, content }
    try {
      const r = await fetch('/api/live/batch', { method: 'POST', body: JSON.stringify(body) })
      const j = await r.json()
      const flat = (j.results || []).map((res: any, i: number) => ({ id: gtins[i], ok: !!res.value?.ok, status: res.value?.status || 0, body: res.value?.body || '' }))
      setRows(flat)
    } finally { setBusy(false) }
  }

  function downloadCsv() {
    const header = ['GTIN','Status','OK','Body']
    const lines = [header, ...rows.map(r=>[r.id, String(r.status), String(r.ok), r.body.replace(/\s+/g,' ').slice(0,300)])]
    const csv = lines.map(line => line.map(cell => '"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'batch_results.csv'
    a.click()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeading title="Batch Live" subtitle="Comma-separated GTINs → fetch → export." accent="presentations" />
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Language</label>
          <input value={lang} onChange={e=>setLang(e.target.value.toUpperCase())} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="EN" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">GTINs (comma/space separated)</label>
          <textarea value={ids} onChange={e=>setIds(e.target.value)} rows={3} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="0711719709695, 5397184119709" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm mb-1">content= (granular, comma-separated)</label>
          <input value={content} onChange={e=>setContent(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="mt-4 flex gap-3 items-center">
        <button onClick={run} disabled={busy || gtins.length===0} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy?'Running…':'Run'}</button>
        <button onClick={downloadCsv} disabled={rows.length===0} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">Download CSV</button>
      </div>
      <div className="mt-4 rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
        <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">Results</div>
        <div className="p-3 overflow-auto">
          <table className="text-sm table-auto">
            <thead><tr><th className="px-2 py-1 text-left">GTIN</th><th className="px-2 py-1 text-left">Status</th><th className="px-2 py-1 text-left">OK</th></tr></thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} className="align-top">
                  <td className="px-2 py-1 font-mono">{r.id}</td>
                  <td className="px-2 py-1">{r.status}</td>
                  <td className="px-2 py-1">{r.ok? '✓':'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

