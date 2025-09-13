"use client"

import { useState } from 'react'
import PageHeading from '@/components/PageHeading'
import { LANGS, GRANULAR } from '@/lib/icecat'

type Mode = 'GTIN'|'MPN'|'ICECAT'

export default function LivePlayground() {
  const [mode, setMode] = useState<Mode>('GTIN')
  const [lang, setLang] = useState('EN')
  const [GTIN, setGTIN] = useState('')
  const [Brand, setBrand] = useState('')
  const [ProductCode, setProductCode] = useState('')
  const [icecat_id, setIcecatId] = useState('')
  const [picks, setPicks] = useState<string[]>(['essentialinfo','title'])
  const [relationsLimit, setRelationsLimit] = useState<number | ''>('')
  const [result, setResult] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const content = picks.join(',') || undefined
  const shopname = process.env.NEXT_PUBLIC_ICECAT_SHOPNAME || 'openicecat-live'

  const body: any = { lang, shopname, content }
  if (relationsLimit !== '') body.relationsLimit = Number(relationsLimit)
  if (mode === 'GTIN' && GTIN) body.GTIN = GTIN
  if (mode === 'MPN' && Brand && ProductCode) { body.Brand = Brand; body.ProductCode = ProductCode }
  if (mode === 'ICECAT' && icecat_id) body.icecat_id = icecat_id

  async function run() {
    setBusy(true); setResult('')
    try {
      const r = await fetch('/api/live', { method: 'POST', body: JSON.stringify(body) })
      const text = await r.text()
      setResult(prettyMaybeJSON(text))
    } finally { setBusy(false) }
  }

  const qs = new URLSearchParams()
  qs.set('lang', lang)
  qs.set('shopname', shopname)
  if (content) qs.set('content', content)
  if (relationsLimit !== '') qs.set('relationsLimit', String(relationsLimit))
  if (mode === 'GTIN' && GTIN) qs.set('GTIN', GTIN)
  if (mode === 'MPN' && Brand && ProductCode) { qs.set('Brand', Brand); qs.set('ProductCode', ProductCode) }
  if (mode === 'ICECAT' && icecat_id) qs.set('icecat_id', icecat_id)
  const demoUrl = `https://live.icecat.biz/api?${qs.toString()}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeading title="Live Playground" subtitle="Explore JSON Live with granular parts." accent="presentations" />
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Language</label>
          <select value={lang} onChange={e=>setLang(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm bg-white">
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Identifier</label>
          <div className="flex gap-2">
            <button className={`tag-chip ${mode==='GTIN'?'tag-chip--active':''}`} onClick={()=>setMode('GTIN')}>GTIN</button>
            <button className={`tag-chip ${mode==='MPN'?'tag-chip--active':''}`} onClick={()=>setMode('MPN')}>Brand + MPN</button>
            <button className={`tag-chip ${mode==='ICECAT'?'tag-chip--active':''}`} onClick={()=>setMode('ICECAT')}>icecat_id</button>
          </div>
        </div>
        {mode==='GTIN' && (
          <div className="md:col-span-2">
            <input value={GTIN} onChange={e=>setGTIN(e.target.value)} placeholder="0711719709695" className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
        )}
        {mode==='MPN' && (<>
          <div>
            <input value={ProductCode} onChange={e=>setProductCode(e.target.value)} placeholder="ProductCode" className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
          <div>
            <input value={Brand} onChange={e=>setBrand(e.target.value)} placeholder="Brand" className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
        </>)}
        {mode==='ICECAT' && (
          <div className="md:col-span-2">
            <input value={icecat_id} onChange={e=>setIcecatId(e.target.value)} placeholder="icecat_id" className="w-full rounded-xl border px-3 py-2 text-sm" />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">relationsLimit (optional)</label>
          <input value={relationsLimit} onChange={e=>setRelationsLimit(e.target.value ? Number(e.target.value) : '')} type="number" min={0} className="w-full rounded-xl border px-3 py-2 text-sm" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm mb-2">Granular parts</div>
        <div className="flex flex-wrap gap-2">
          {GRANULAR.map(g => (
            <button key={g} onClick={()=>togglePick(g, picks, setPicks)} className={`tag-chip ${picks.includes(g)?'tag-chip--active':''}`}>{g}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex gap-3 items-center">
        <button onClick={run} disabled={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy?'Running…':'Run'}</button>
        <a href={demoUrl} target="_blank" rel="noreferrer" className="underline text-sm">Open request</a>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <section className="rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
          <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">Result</div>
          <pre className="p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">{result}</pre>
        </section>
        <section className="rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
          <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">wget snippet</div>
          <pre className="p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">{wgetSnippet(demoUrl)}</pre>
        </section>
      </div>
    </div>
  )
}

function prettyMaybeJSON(text: string) {
  try { return JSON.stringify(JSON.parse(text), null, 2) } catch { return text }
}

function togglePick(g: string, picks: string[], set: (next: string[])=>void) {
  const s = new Set(picks)
  if (s.has(g)) s.delete(g); else s.add(g)
  set(Array.from(s))
}

function wgetSnippet(url: string) {
  return [
    'wget --continue \\','  --header "api-token: $ICECAT_API_TOKEN" \\','  --header "content-token: $ICECAT_CONTENT_TOKEN" \\',`  "${url}"`
  ].join('\n')
}

