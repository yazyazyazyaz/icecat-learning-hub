"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { previewBatch, runBatch, runSingle } from "@/actions/wizard"
import { hasAppKey } from "@/actions/profile"
import { Hourglass, Download, FileText, Link2 } from "lucide-react"

const LANGS = [
  'INT','EN','NL','FR','DE','IT','ES','DK','RU','US','BR','PT','ZH','SV','PL','CZ','HU','FI','EL','NO','TR','BG','KA','RO','SR','UK','JA','CA','ES_AR','HR','AR','VI','KO','MK','SL','EN_SG','EN_ZA','ZH_TW','HE','LT','LV','EN_IN','DE_CH','ID','SK','FA','ES_MX','ET','DE_BE','FR_BE','NL_BE','TH','RU_UA','DE_AT','FR_CH','EN_NZ','EN_SA','EN_ID','EN_MY','HI','FR_CA','TE','TA','KN','EN_IE','ML','EN_AE','ES_CL','ES_PE','ES_CO','MR','BN','MS','EN_AU','IT_CH','EN_PH','FL_PH','EN_CA','EN_EG','AR_EG','AR_SA'
] as const

export default function WizardClient() {
  const [mode, setMode] = useState<'single'|'batch'>('single')
  const [matchBy, setMatchBy] = useState<'EAN'|'MPN'|null>(null)
  const [busy, start] = useTransition()
  const [singleResult, setSingleResult] = useState<string | null>(null)
  const [singleUrl, setSingleUrl] = useState<string | null>(null)
  const [singleError, setSingleError] = useState<string | null>(null)
  const [singleFmt, setSingleFmt] = useState<'JSON'|'XML'>('JSON')
  const [batchPreview, setBatchPreview] = useState<{ token: string; headers: string[]; rows: any[][]; totalRows: number } | null>(null)
  const [batchResult, setBatchResult] = useState<{ path: string; errorsXlsx?: string; linksXlsx?: string; metrics?: { totalRows:number; attempted:number; success:number; failed:number; successRate:number } } | null>(null)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [colEan, setColEan] = useState<number>(-1)
  const [colBrand, setColBrand] = useState<number>(-1)
  const [colMpn, setColMpn] = useState<number>(-1)
  const [eta, setEta] = useState<number>(0)
  const etaRef = useRef<any>(null)
  const [batchFmt, setBatchFmt] = useState<'JSON'|'XML'>('JSON')

  function clearBatch() {
    if (etaRef.current) { clearInterval(etaRef.current); etaRef.current = null }
    setBatchPreview(null)
    setBatchResult(null)
    setColEan(-1); setColBrand(-1); setColMpn(-1)
    setEta(0)
    try {
      localStorage.removeItem('wizard:batchPreview')
      localStorage.removeItem('wizard:batchResult')
      localStorage.removeItem('wizard:cols')
    } catch {}
  }

  function onUploadPreview(formData: FormData) {
    const file = formData.get('file') as any as File | null
    if (!file || typeof file !== 'object' || !(file as any).size) {
      setBatchError('Please upload a file to continue.')
      return
    }
    start(async () => {
      setBatchPreview(null); setBatchResult(null)
      setBatchError(null)
      const res = await previewBatch(formData)
      if ((res as any)?.ok) {
        const { token, headers, rows, totalRows } = res as any
        setBatchPreview({ token, headers, rows, totalRows })
        // try to auto-detect columns by header
        headers.forEach((h: string, i: number) => {
          const hn = h.toLowerCase()
          if (colEan<0 && (hn.includes('ean')||hn.includes('gtin')||hn.includes('barcode'))) setColEan(i)
          if (colBrand<0 && (hn.includes('brand')||hn.includes('vendor'))) setColBrand(i)
          if (colMpn<0 && (hn.includes('mpn')||hn.includes('prod')||hn.includes('sku'))) setColMpn(i)
        })
        // estimate ~0.8s per row as a baseline for countdown
        const est = Math.ceil((totalRows || 0) * 0.8)
        setEta(est)
        try { localStorage.setItem('wizard:batchPreview', JSON.stringify({ token, headers, rows, totalRows })) } catch {}
        try { localStorage.setItem('wizard:cols', JSON.stringify({ colEan, colBrand, colMpn })) } catch {}
      }
    })
  }

  function onSingle(formData: FormData) {
    if (!matchBy) return
    formData.append('mode', matchBy)
    start(async () => {
      setSingleResult(null)
      setSingleUrl(null)
      setSingleError(null)
      try {
        if (singleFmt === 'JSON') {
          const ok = await hasAppKey()
          if (!ok) throw new Error('Missing App Key in Profile')
        }
        const res = await runSingle(formData)
        const p = (res as any)?.path || null
        const u = (res as any)?.url || null
        setSingleResult(p)
        setSingleUrl(u)
        try { if (p) localStorage.setItem('wizard:singleResult', p) } catch {}
      } catch (e: any) {
        setSingleError(String(e?.message || 'Failed'))
      }
    })
  }

  function onRunBatch(formData: FormData) {
    if (!batchPreview) return
    formData.append('token', batchPreview.token)
    start(async () => {
      setBatchResult(null)
      setBatchError(null)
      if (batchFmt === 'JSON') {
        try {
          const ok = await hasAppKey()
          if (!ok) {
            setBatchError('Missing App Key in Profile')
            return
          }
        } catch {
          setBatchError('Missing App Key in Profile')
          return
        }
      }
      // start countdown timer
      if (etaRef.current) clearInterval(etaRef.current)
      let remaining = Math.max(0, eta)
      setEta(remaining)
      etaRef.current = setInterval(() => {
        remaining -= 1
        setEta(Math.max(0, remaining))
        if (remaining <= 0) { clearInterval(etaRef.current); etaRef.current = null }
      }, 1000)
      const res = await runBatch(formData)
      if (etaRef.current) { clearInterval(etaRef.current); etaRef.current = null }
      const next = { path: (res as any)?.path, errorsXlsx: (res as any)?.errorsXlsx, linksXlsx: (res as any)?.linksXlsx, metrics: (res as any)?.metrics }
      setBatchResult(next)
      try { localStorage.setItem('wizard:batchResult', JSON.stringify(next)) } catch {}
    })
  }

  useEffect(() => () => { if (etaRef.current) clearInterval(etaRef.current) }, [])

  // Persist and restore state across reloads
  useEffect(() => {
    try {
      const sr = localStorage.getItem('wizard:singleResult'); if (sr) setSingleResult(sr)
      const mb = localStorage.getItem('wizard:matchBy'); if (mb) setMatchBy(mb as any)
      const mm = localStorage.getItem('wizard:mode'); if (mm) setMode(mm as any)
      const sf = localStorage.getItem('wizard:singleFmt'); if (sf) setSingleFmt(sf as any)
      const bf = localStorage.getItem('wizard:batchFmt'); if (bf) setBatchFmt(bf as any)
      const bp = localStorage.getItem('wizard:batchPreview'); if (bp) setBatchPreview(JSON.parse(bp))
      const br = localStorage.getItem('wizard:batchResult'); if (br) setBatchResult(JSON.parse(br))
      const cols = localStorage.getItem('wizard:cols'); if (cols) {
        const o = JSON.parse(cols)
        if (typeof o.colEan==='number') setColEan(o.colEan)
        if (typeof o.colBrand==='number') setColBrand(o.colBrand)
        if (typeof o.colMpn==='number') setColMpn(o.colMpn)
      }
    } catch {}
  }, [])

  useEffect(() => { try { if (matchBy) localStorage.setItem('wizard:matchBy', matchBy) } catch {} }, [matchBy])
  useEffect(() => { try { if (mode) localStorage.setItem('wizard:mode', mode) } catch {} }, [mode])
  useEffect(() => { try { localStorage.setItem('wizard:cols', JSON.stringify({ colEan, colBrand, colMpn })) } catch {} }, [colEan, colBrand, colMpn])
  useEffect(() => { try { localStorage.setItem('wizard:singleFmt', singleFmt) } catch {} }, [singleFmt])
  useEffect(() => { try { localStorage.setItem('wizard:batchFmt', batchFmt) } catch {} }, [batchFmt])

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <button className={`tag-chip ${mode==='single'?'tag-chip--active':''}`} onClick={()=>setMode('single')}>Single Product</button>
        <button className={`tag-chip ${mode==='batch'?'tag-chip--active':''}`} onClick={()=>setMode('batch')}>Batch</button>
        {busy && (
          <span className="ml-2 inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <Hourglass className="w-4 h-4 animate-spin text-emerald-700 dark:text-sky-400" /> Working…
            {mode==='batch' && eta>0 && <span className="text-xs">ETA: {eta}s</span>}
          </span>
        )}
      </div>

      {mode === 'single' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm">Match by:</span>
          <button className={`tag-chip ${matchBy==='EAN'?'tag-chip--active':''}`} onClick={()=>setMatchBy('EAN')}>EAN</button>
          <button className={`tag-chip ${matchBy==='MPN'?'tag-chip--active':''}`} onClick={()=>setMatchBy('MPN')}>MPN + Brand</button>
        </div>
      )}

      {mode === 'single' && matchBy && (
        <form action={onSingle} className="grid md:grid-cols-3 gap-3 items-end mt-4">
          {/* Removed inline error here to avoid duplicate messaging; error shows below in a single bracket */}
          {matchBy==='EAN' && (
          <div>
            <label className="block text-sm mb-1">EAN</label>
            <input name="ean" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="5397184119709" />
          </div>
          )}
          {matchBy==='MPN' && (<>
          <div>
            <label className="block text-sm mb-1">MPN</label>
            <input name="mpn" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. 5587-9709" />
          </div>
          <div>
            <label className="block text-sm mb-1">Brand</label>
            <input name="brand" required className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="e.g. Dell" />
          </div>
          </>)}
          <div>
            <label className="block text-sm mb-1">Icecat username</label>
            <input name="username" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Icecat username" />
          </div>
          <div>
            <label className="block text-sm mb-1">{singleFmt==='XML' ? 'Password' : 'App Key (from Profile)'}</label>
            {singleFmt==='JSON' ? (
              <div className="w-full rounded-xl border px-3 py-2 text-sm bg-neutral-100 text-neutral-600">Uses App Key from Profile <a className="underline ml-2" href="/profile">Go to Profile</a></div>
            ) : (
              <input name="password" type="password" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Enter password" />
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Language</label>
            <select name="lang" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" defaultValue="EN">
              {LANGS.map((l)=> <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Format</label>
            <select name="format" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" value={singleFmt} onChange={(e)=>setSingleFmt(e.target.value as any)}>
              <option value="JSON">JSON</option>
              <option value="XML">XML</option>
            </select>
          </div>
          {/* App Key is managed from Profile and applied server-side for JSON */}
          <div>
            <button disabled={busy} aria-busy={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy? 'Running…' : 'Fetch'}</button>
          </div>
          {(singleResult || singleError) && (
            <div className="md:col-span-3 grid gap-2">
              {singleResult && (
                <div className="inline-block max-w-full rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-800 dark:text-white text-sm px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <a className="underline" href={singleResult} download>
                      {singleFmt === 'JSON' ? 'Download the JSON' : 'Download the XML'}
                    </a>
                  </div>
                  {singleUrl && (
                    <div className="pl-6 grid gap-1 mt-1">
                      <a className="underline break-all" href={singleUrl} target="_blank" rel="noreferrer">
                        API link
                      </a>
                    </div>
                  )}
                </div>
              )}
              {singleError && (
                <div className="inline-block max-w-full rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm px-3 py-2">
                  <em>{singleError}</em>
                </div>
              )}
              <div>
                <button type="button" className="px-3 py-1.5 rounded-full border text-sm" onClick={()=>{ setSingleResult(null); setSingleUrl(null); setSingleError(null); try{ localStorage.removeItem('wizard:singleResult') } catch {} }}>Start over</button>
              </div>
            </div>
          )}
        </form>
      )}

      {mode === 'batch' && (
        <div className="mt-4">
          {!batchPreview ? (
            <form action={onUploadPreview} className="grid md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Upload file (XLSX or CSV)</label>
                <input name="file" type="file" accept=".xlsx,.csv" className="w-full text-sm" />
              </div>
              <div>
                <button disabled={busy} aria-busy={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy? 'Loading…':'Preview'}</button>
              </div>
            </form>
          ) : (
            <>
              <div className="rounded-xl border bg-white text-sm min-w-0 w-full max-w-full overflow-hidden">
                <div className="px-3 py-2 text-xs text-slate-500 border-b border-[hsl(var(--muted))]">Preview (first 2 rows)</div>
                <div className="p-3 max-h-[70vh] overflow-y-auto overscroll-contain w-full max-w-full">
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="table-auto text-sm w-max">
                      <thead>
                        <tr>
                          {batchPreview.headers.map((h,i)=>(<th key={i} className="px-2 py-1 text-left whitespace-nowrap">{h||`Col ${i+1}`}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {batchPreview.rows.map((r,ri)=>(
                          <tr key={ri}>
                            {batchPreview.headers.map((_,ci)=>(<td key={ci} className="px-2 py-1 whitespace-nowrap">{String(r[ci] ?? '')}</td>))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <form action={onRunBatch} className="grid md:grid-cols-3 gap-3 items-end mt-3">
                <div>
                  <label className="block text-sm mb-1">EAN column</label>
                  <select name="col_ean" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" value={colEan} onChange={(e)=>setColEan(Number(e.target.value))}>
                    <option value={-1}>(none)</option>
                    {batchPreview.headers.map((h,i)=>(<option key={i} value={i}>{h||`Col ${i+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Brand column</label>
                  <select name="col_brand" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" value={colBrand} onChange={(e)=>setColBrand(Number(e.target.value))}>
                    <option value={-1}>(none)</option>
                    {batchPreview.headers.map((h,i)=>(<option key={i} value={i}>{h||`Col ${i+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">MPN column</label>
                  <select name="col_mpn" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" value={colMpn} onChange={(e)=>setColMpn(Number(e.target.value))}>
                    <option value={-1}>(none)</option>
                    {batchPreview.headers.map((h,i)=>(<option key={i} value={i}>{h||`Col ${i+1}`}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Icecat username</label>
                  <input name="username" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Icecat username" />
                </div>
                {batchFmt==='XML' && (
                  <div>
                    <label className="block text-sm mb-1">Icecat password</label>
                    <input name="password" type="password" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="For XML auth" />
                  </div>
                )}
                <div>
                  <label className="block text-sm mb-1">Language</label>
                  <select name="lang" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" defaultValue="EN">
                    {LANGS.map((l)=> <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                <label className="block text-sm mb-1">Format</label>
                <select name="format" className="w-full rounded-xl border px-3 py-2 text-sm bg-white" value={batchFmt} onChange={(e)=>setBatchFmt(e.target.value as any)}>
                  <option value="JSON">JSON</option>
                  <option value="XML">XML</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">{batchFmt==='XML' ? 'Password' : 'App Key (from Profile)'}</label>
                {batchFmt==='JSON' ? (
                  <div className="w-full rounded-xl border px-3 py-2 text-sm bg-neutral-100 text-neutral-600">Uses App Key from Profile <a className="underline ml-2" href="/profile">Go to Profile</a></div>
                ) : (
                  <input name="password" type="password" className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Enter password" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button disabled={busy} aria-busy={busy} className="rounded-full border px-4 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">{busy? 'Running…' : 'Run'}</button>
                <button type="button" onClick={clearBatch} disabled={busy} className="rounded-full border px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">Clear</button>
              </div>
                {batchResult && (
                  <div className="md:col-span-3 grid gap-2">
                    <div className="inline-block max-w-full rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-800 dark:text-white text-sm px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        <a className="underline" href={batchResult.path} download>Download ZIP</a>
                      </div>
                      <div className="pl-6 grid gap-1 mt-1">
                        {batchResult.errorsXlsx && (
                          <a className="inline-flex items-center gap-2 underline" href={batchResult.errorsXlsx} download>
                            <FileText className="h-4 w-4" /> Error logs (XLSX)
                          </a>
                        )}
                        {batchResult.linksXlsx && (
                          <a className="inline-flex items-center gap-2 underline" href={batchResult.linksXlsx} download>
                            <Link2 className="h-4 w-4" /> Links (XLSX)
                          </a>
                        )}
                      </div>
                    </div>
                    {batchResult.metrics && (
                      <div className="inline-block max-w-full rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm px-3 py-2">
                        <div>
                          Coverage: <span className="text-green-700 font-medium">{batchResult.metrics.success}/{batchResult.metrics.totalRows} matched ({batchResult.metrics.successRate}%)</span>
                        </div>
                        <div>
                          Attempted: <span className="text-orange-600 font-medium">{batchResult.metrics.attempted}</span>
                        </div>
                        <div>
                          Failed: <span className="text-red-800 font-medium">{batchResult.metrics.failed}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}
      {(!matchBy) && (
        <div className="mt-4 text-sm text-neutral-600">Select a matching method (EAN or MPN + Brand) to continue.</div>
      )}
    </div>
  )
}
