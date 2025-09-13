"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { promises as fs } from 'fs'
import path from 'path'
import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

function ensureAuth(session: any) {
  if (!session?.user) throw new Error('Unauthorized')
}

function safeUploadDir(...parts: string[]) {
  return path.join(process.cwd(), 'public', 'uploads', ...parts)
}

function safeName(s: string | undefined | null) {
  return (s ?? '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120)
}

function getShopName(formShop?: string) {
  const s = (formShop || '').trim()
  return s || process.env.ICECAT_SHOPNAME || process.env.NEXT_PUBLIC_ICECAT_SHOPNAME || 'openicecat-live'
}

async function getAppKeyForCurrentUser(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return null
  try {
    const prof: any = await (db as any).user.findUnique({ where: { id: userId } })
    if (prof?.appKey) return prof.appKey
  } catch {
    // ignore
  }
  try {
    await (db as any).$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "UserKV" (userId TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE, key TEXT NOT NULL, value TEXT, PRIMARY KEY (userId,key))')
  } catch {}
  try {
    const rows: any[] = await (db as any).$queryRawUnsafe('SELECT value FROM "UserKV" WHERE "userId"=$1 AND key=$2', userId, 'appKey')
    return rows?.[0]?.value ?? null
  } catch { return null }
}

function enc(s: string) { return encodeURIComponent(s) }

function buildJsonUrlByEan({ shop, lang, ean, appKey }: { shop: string; lang: string; ean: string; appKey: string }): string {
  // Place app_key immediately after shopname as per requested format
  return `https://live.icecat.biz/api?shopname=${enc(shop)}&app_key=${enc(appKey)}&lang=${lang}&GTIN=${enc(ean)}&content=`
}

function buildJsonUrlByMpnBrand({ shop, lang, brand, mpn, appKey }: { shop: string; lang: string; brand: string; mpn: string; appKey: string }): string {
  // Place app_key immediately after shopname as per requested format
  return `https://live.icecat.biz/api?shopname=${enc(shop)}&app_key=${enc(appKey)}&lang=${lang}&Brand=${enc(brand)}&ProductCode=${enc(mpn)}&content=`
}

function buildXmlUrlByEan({ lang, ean }: { lang: string; ean: string }): string {
  return `https://data.icecat.biz/xml_s3/xml_server3.cgi?lang=${lang};ean_upc=${enc(ean)};output=productxml`
}

function buildXmlUrlByMpnBrand({ lang, brand, mpn }: { lang: string; brand: string; mpn: string }): string {
  return `https://data.icecat.biz/xml_s3/xml_server3.cgi?lang=${lang};prod_id=${enc(mpn)};vendor=${enc(brand)};output=productxml`
}

async function fetchJson(url: string): Promise<Buffer> {
  const res = await fetch(url, { method: 'GET' })
  const bodyText = await res.text().catch(() => '')
  if (!res.ok) {
    let msg = ''
    try {
      const j = JSON.parse(bodyText)
      msg = (j.Message || j.message || j.error || j.Error || '').toString()
    } catch {}
    if (!msg) msg = bodyText.slice(0, 1000).replace(/\s+/g, ' ').trim()
    throw new Error(`JSON ${res.status}: ${msg || 'request failed'}`)
  }
  // Some Icecat responses may be HTTP 200 but contain a Message indicating not found
  try {
    const j = JSON.parse(bodyText)
    const maybeMsg = (j.Message || j.message || '').toString()
    if (maybeMsg && /not\s+present|not\s+found|no\s+match/i.test(maybeMsg)) {
      throw new Error(maybeMsg)
    }
  } catch {
    // ignore JSON parse errors; treat as binary content
  }
  return Buffer.from(bodyText, 'utf8')
}

async function fetchXml(url: string, auth: { user?: string; pass?: string }): Promise<Buffer> {
  const headers: any = {}
  if (auth.user && auth.pass) {
    const token = Buffer.from(`${auth.user}:${auth.pass}`).toString('base64')
    headers['Authorization'] = `Basic ${token}`
  }
  const res = await fetch(url, { method: 'GET', headers })
  const bodyText = await res.text().catch(() => '')
  if (!res.ok) {
    let msg = ''
    // Try to extract an XML error message
    const m = bodyText.match(/Message\"?>([^<]+)</i) || bodyText.match(/ErrorMessage=\"([^\"]+)/i)
    if (m && m[1]) msg = m[1]
    if (!msg) msg = bodyText.slice(0, 1000).replace(/\s+/g, ' ').trim()
    throw new Error(`XML ${res.status}: ${msg || 'request failed'}`)
  }
  // Detect embedded error despite 200
  if (/requested\s+product\s+is\s+not\s+present|not\s+found|no\s+match/i.test(bodyText)) {
    // Try get clearer message
    let msg = 'The requested product is not present in the Icecat database'
    const m = bodyText.match(/Message\"?>([^<]+)</i) || bodyText.match(/ErrorMessage=\"([^\"]+)/i)
    if (m && m[1]) msg = m[1]
    throw new Error(msg)
  }
  return Buffer.from(bodyText, 'utf8')
}

// Filename helpers (preserve semantics; sanitize only for FS)
function fileNameJsonByEan(lang: string) { return `GTIN_${lang}.json` }
function fileNameJsonByMpnBrand(mpn: string, brand: string, lang: string) { return `${safeName(mpn)}_${safeName(brand)}_${lang}.json` }
function fileNameXmlByEan(lang: string) { return `GTIN_${lang}.xml` }
function fileNameXmlByMpnBrand(mpn: string, brand: string, lang: string) { return `${safeName(mpn)}_${safeName(brand)}_${lang}.xml` }

export async function runSingle(formData: FormData) {
  const session = await getServerSession(authOptions)
  ensureAuth(session)
  const userId = (session?.user as any)?.id as string | undefined
  const appKey = await getAppKeyForCurrentUser()
  const mode = (String(formData.get('mode') || 'EAN').toUpperCase() === 'MPN' ? 'MPN' : 'EAN') as 'EAN'|'MPN'
  const ean = String(formData.get('ean') || '').trim() || undefined
  const mpn = String(formData.get('mpn') || '').trim() || undefined
  const brand = String(formData.get('brand') || '').trim() || undefined
  const user = String(formData.get('username') || '').trim() || undefined
  const pass = String(formData.get('password') || '').trim() || undefined
  const lang = (String(formData.get('lang') || 'EN').toUpperCase())
  const fmt = (String(formData.get('format') || 'JSON').toUpperCase()) as 'JSON'|'XML'

  if (fmt === 'JSON') {
    if (!appKey) throw new Error('Missing App Key in Profile')
    const shop = getShopName(user)
    let url = ''
    let filename = ''
    if (mode === 'EAN') {
      if (!ean) throw new Error('EAN required')
      url = buildJsonUrlByEan({ shop, lang, ean, appKey })
      filename = fileNameJsonByEan(lang)
    } else {
      if (!brand || !mpn) throw new Error('Brand and MPN required')
      url = buildJsonUrlByMpnBrand({ shop, lang, brand, mpn, appKey })
      filename = fileNameJsonByMpnBrand(mpn, brand, lang)
    }
    const buf = await fetchJson(url)
    const dir = safeUploadDir('wizard')
    await fs.mkdir(dir, { recursive: true })
    const outPath = path.join(dir, filename)
    await fs.writeFile(outPath, buf)
    revalidatePath('/wizard')
    return { ok: true, path: `/uploads/wizard/${filename}`, url }
  } else {
    const auth = { user, pass }
    let url = ''
    let filename = ''
    if (mode === 'EAN') {
      if (!ean) throw new Error('EAN required')
      url = buildXmlUrlByEan({ lang, ean })
      filename = fileNameXmlByEan(lang)
    } else {
      if (!brand || !mpn) throw new Error('Brand and MPN required')
      url = buildXmlUrlByMpnBrand({ lang, brand, mpn })
      filename = fileNameXmlByMpnBrand(mpn, brand, lang)
    }
    const buf = await fetchXml(url, auth)
    const dir = safeUploadDir('wizard')
    await fs.mkdir(dir, { recursive: true })
    const outPath = path.join(dir, filename)
    await fs.writeFile(outPath, buf)
    revalidatePath('/wizard')
    return { ok: true, path: `/uploads/wizard/${filename}`, url }
  }
}

export async function previewBatch(formData: FormData) {
  const session = await getServerSession(authOptions)
  ensureAuth(session)
  const file = formData.get('file') as any as File
  if (!file || !(file as any).arrayBuffer) throw new Error('No file uploaded')
  const bytes = Buffer.from(await file.arrayBuffer())
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const tmpDir = safeUploadDir('wizard','tmp')
  await fs.mkdir(tmpDir, { recursive: true })
  const tmpPath = path.join(tmpDir, `${token}.bin`)
  await fs.writeFile(tmpPath, bytes)
  // Parse preview (first sheet, first 2 rows)
  const wb = XLSX.read(bytes, { type: 'buffer' })
  const wsName = wb.SheetNames[0]
  const ws = wb.Sheets[wsName]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
  const headers = (json[0] || []).map(String)
  const rows = (json.slice(1, 3) || [])
  // Count only non-empty data rows for ETA purposes
  const allDataRows = (json.slice(1) || [])
  const nonEmpty = allDataRows.filter(r => Array.isArray(r) && r.some(v => String(v ?? '').trim() !== ''))
  const totalRows = nonEmpty.length
  return { ok: true, token, headers, rows, totalRows }
}

export async function runBatch(formData: FormData) {
  const session = await getServerSession(authOptions)
  ensureAuth(session)
  const appKey = await getAppKeyForCurrentUser()
  const token = String(formData.get('token') || '')
  const lang = (String(formData.get('lang') || 'EN').toUpperCase())
  const fmt = (String(formData.get('format') || 'JSON').toUpperCase()) as 'JSON'|'XML'
  const colEan = Number(formData.get('col_ean') || -1)
  const colBrand = Number(formData.get('col_brand') || -1)
  const colMpn = Number(formData.get('col_mpn') || -1)
  const user = String(formData.get('username') || '').trim() || undefined
  const pass = String(formData.get('password') || '').trim() || undefined

  const tmpPath = safeUploadDir('wizard','tmp', `${token}.bin`)
  const bytes = await fs.readFile(tmpPath)
  const wb = XLSX.read(bytes, { type: 'buffer' })
  const wsName = wb.SheetNames[0]
  const ws = wb.Sheets[wsName]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[]
  const rows = (data.slice(1) || []).filter((r:any[]) => {
    const ean = colEan >= 0 ? String(r[colEan] || '').trim() : ''
    const brand = colBrand >= 0 ? String(r[colBrand] || '').trim() : ''
    const mpn = colMpn >= 0 ? String(r[colMpn] || '').trim() : ''
    return Boolean(ean) || (Boolean(mpn) && Boolean(brand))
  })

  const zip = new JSZip()
  const logRows: Array<{ key: string; lang: string; status: 'OK'|'ERROR'; message: string }>=[]
  // Collect error rows for XLSX export
  const errRowsEan: Array<[string, string, string, string, string]> = [] // [EAN, Lang, Status, Message, Request]
  const errRowsMpn: Array<[string, string, string, string, string, string]> = [] // [MPN, Brand, Lang, Status, Message, Request]
  // Collect all attempted request links (single-column workbook)
  const linkRows: Array<[string]> = []
  let attempted = 0
  let success = 0
  let failed = 0
  for (const row of rows) {
    const ean = colEan >= 0 ? String(row[colEan] || '').trim() : ''
    const brand = colBrand >= 0 ? String(row[colBrand] || '').trim() : ''
    const mpn = colMpn >= 0 ? String(row[colMpn] || '').trim() : ''
    // Skip if no identifiers provided
    if (!ean && !(mpn && brand)) continue
    attempted++
    try {
      // Prefer MPN+Brand if both provided (single attempt), else EAN
      let result: { buf: Buffer; filename: string } | null = null
      let lastUrl: string | null = null
      if (mpn && brand) {
        if (fmt === 'JSON') {
          if (!appKey) throw new Error('Missing App Key in Profile')
          const shop = getShopName(user)
          const url = buildJsonUrlByMpnBrand({ shop, lang, brand, mpn, appKey })
          lastUrl = url
          const buf = await fetchJson(url)
          result = { buf, filename: fileNameJsonByMpnBrand(mpn, brand, lang) }
        } else {
          const url = buildXmlUrlByMpnBrand({ lang, brand, mpn })
          lastUrl = url
          const buf = await fetchXml(url, { user, pass })
          result = { buf, filename: fileNameXmlByMpnBrand(mpn, brand, lang) }
        }
      }
      if (!result && ean) {
        if (fmt === 'JSON') {
          if (!appKey) throw new Error('Missing App Key in Profile')
          const shop = getShopName(user)
          const url = buildJsonUrlByEan({ shop, lang, ean, appKey })
          lastUrl = url
          const buf = await fetchJson(url)
          result = { buf, filename: fileNameJsonByEan(lang) }
        } else {
          const url = buildXmlUrlByEan({ lang, ean })
          lastUrl = url
          const buf = await fetchXml(url, { user, pass })
          result = { buf, filename: fileNameXmlByEan(lang) }
        }
      }
      if (!result) throw new Error('No match for provided identifiers')
      const { buf, filename } = result
      zip.file(filename, buf)
      logRows.push({ key: (ean || `${brand}:${mpn}`) as string, lang, status: 'OK', message: '' })
      if (lastUrl) linkRows.push([lastUrl])
      success++
    } catch (e) {
      const msg = ((e as any)?.message || 'failed').toString()
      // Build the exact request URL used (without secrets for XML; JSON includes app_key by design)
      let reqUrl = ''
      if (mpn && brand) {
        const shop = getShopName(user)
        reqUrl = fmt === 'JSON'
          ? buildJsonUrlByMpnBrand({ shop, lang, brand, mpn, appKey: appKey || '' })
          : buildXmlUrlByMpnBrand({ lang, brand, mpn })
      } else if (ean) {
        const shop = getShopName(user)
        reqUrl = fmt === 'JSON'
          ? buildJsonUrlByEan({ shop, lang, ean, appKey: appKey || '' })
          : buildXmlUrlByEan({ lang, ean })
      }
      logRows.push({ key: (ean || `${brand}:${mpn}`) as string, lang, status: 'ERROR', message: msg })
      // Add to XLSX error rows with dynamic identifier columns
      if (mpn && brand) {
        const shop = getShopName(user)
        const reqUrl = fmt === 'JSON'
          ? buildJsonUrlByMpnBrand({ shop, lang, brand, mpn, appKey: appKey || '' })
          : buildXmlUrlByMpnBrand({ lang, brand, mpn })
        errRowsMpn.push([mpn, brand, lang, 'ERROR', msg, reqUrl])
        linkRows.push([reqUrl])
      } else if (ean) {
        const shop = getShopName(user)
        const reqUrl = fmt === 'JSON'
          ? buildJsonUrlByEan({ shop, lang, ean, appKey: appKey || '' })
          : buildXmlUrlByEan({ lang, ean })
        errRowsEan.push([ean, lang, 'ERROR', msg, reqUrl])
        linkRows.push([reqUrl])
      }
      failed++
    }
  }

  const blob = await zip.generateAsync({ type: 'nodebuffer' })
  const dir = safeUploadDir('wizard')
  await fs.mkdir(dir, { recursive: true })
  const out = path.join(dir, `batch_${token}.zip`)
  await fs.writeFile(out, blob)
  // Write XLSX error workbook with dynamic identifier columns
  const wbErr = XLSX.utils.book_new()
  if (errRowsEan.length > 0) {
    const header = ['EAN','Lang','Status','Message','Request']
    const sheet = XLSX.utils.aoa_to_sheet([header, ...errRowsEan])
    XLSX.utils.book_append_sheet(wbErr, sheet, 'Errors_EAN')
  }
  if (errRowsMpn.length > 0) {
    const header = ['MPN','Brand','Lang','Status','Message','Request']
    const sheet = XLSX.utils.aoa_to_sheet([header, ...errRowsMpn])
    XLSX.utils.book_append_sheet(wbErr, sheet, 'Errors_MPN')
  }
  let errorsXlsxPath: string | null = null
  if ((errRowsEan.length + errRowsMpn.length) > 0) {
    const xbuf = XLSX.write(wbErr, { bookType: 'xlsx', type: 'buffer' }) as Buffer
    const xfile = path.join(dir, `batch_${token}_errors.xlsx`)
    await fs.writeFile(xfile, xbuf)
    errorsXlsxPath = `/uploads/wizard/${path.basename(xfile)}`
  }

  // Write XLSX download links (single column)
  let linksXlsxPath: string | null = null
  if (linkRows.length > 0) {
    const wbLinks = XLSX.utils.book_new()
    const header = ['Download links']
    const sheet = XLSX.utils.aoa_to_sheet([header, ...linkRows])
    XLSX.utils.book_append_sheet(wbLinks, sheet, 'Links')
    const lbuf = XLSX.write(wbLinks, { bookType: 'xlsx', type: 'buffer' }) as Buffer
    const lfile = path.join(dir, `batch_${token}_links.xlsx`)
    await fs.writeFile(lfile, lbuf)
    linksXlsxPath = `/uploads/wizard/${path.basename(lfile)}`
  }
  revalidatePath('/wizard')
  const totalRows = Math.max(0, rows.length)
  return {
    ok: true,
    path: `/uploads/wizard/${path.basename(out)}`,
    errorsXlsx: errorsXlsxPath || undefined,
    linksXlsx: linksXlsxPath || undefined,
    metrics: {
      totalRows,
      attempted,
      success,
      failed,
      successRate: totalRows ? Math.round((success / totalRows) * 100) : 0,
    }
  }
}
