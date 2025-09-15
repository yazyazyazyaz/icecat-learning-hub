/* scripts/csv_to_learningPaths.ts
   Converts data/learning_paths.csv (as pasted from your source) into data/learningPaths.ts
   Expected columns (order-based, header row optional):
   0: Title
   1: Learning path (e.g., Onboarding week | Third week | Fourth week | BONUS)
   2: Program
   3: Note
   4: Attachment (e.g., "File name (https://url)")
   5: Trainer
   6+: Additional notes columns (optional)
*/
import { promises as fs } from 'fs'
import path from 'path'

function parseCSV(input: string): string[][] {
  const rows: string[][] = []
  let i = 0, field = '', row: string[] = []
  let inQuotes = false
  while (i < input.length) {
    const ch = input[i]
    if (inQuotes) {
      if (ch === '"') {
        const next = input[i+1]
        if (next === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      } else {
        field += ch; i++; continue
      }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue }
      if (ch === ',') { row.push(field); field = ''; i++; continue }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
      if (ch === '\r') { i++; continue }
      field += ch; i++
    }
  }
  if (field.length > 0 || row.length) { row.push(field); rows.push(row) }
  return rows
}

function slugify(s: string) {
  return (s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function cleanMd(s: string) {
  return (s || '').replace(/#NAME\?/g, '').trim()
}

type Attachment = { name: string; url: string }

function parseAttachment(s: string): Attachment[] {
  const out: Attachment[] = []
  const m = /([^()]+)\((https?:[^)]+)\)/.exec(s || '')
  if (m) {
    const name = m[1].trim().replace(/\s+$/,'')
    const url = m[2].trim()
    out.push({ name, url })
  }
  return out
}

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'learning_paths.csv')
  const outPath = path.join(process.cwd(), 'data', 'learningPaths.ts')
  const raw = await fs.readFile(csvPath, 'utf8')
  const rows = parseCSV(raw)
  if (!rows.length) throw new Error('CSV appears empty')

  // Skip header if present
  const start = (rows[0][1] && /learning\s*path/i.test(rows[0][1])) ? 1 : 0

  type Item = { day: number|null; title: string; programMd?: string|null; noteMd?: string|null; trainer?: string|null; attachments?: Attachment[]; position: number }
  const byPath = new Map<string, { slug: string; title: string; items: Item[] }>()
  const posMap = new Map<string, number>() // key: path|day

  for (let r = start; r < rows.length; r++) {
    const cols = rows[r]
    if (!cols.length) continue
    const titleRaw = (cols[0] || '').trim()
    const pathTitle = (cols[1] || '').trim() || 'Onboarding week'
    if (!titleRaw || /^(?:Title|Fourth Week)$/i.test(titleRaw)) continue
    // Extract day prefix like "1 – Title" or "6- Title"
    const dm = /^\s*(\d+)\s*[–-]\s*(.*)$/.exec(titleRaw)
    const day = dm ? Number(dm[1]) : null
    const title = dm ? dm[2].trim() : titleRaw.trim()
    const program = cleanMd(cols[2] || '')
    const note = cleanMd(cols[3] || '')
    const attach = parseAttachment(cols[4] || '')
    const trainer = (cols[5] || '').trim() || null
    const note2 = cleanMd((cols[6] || '') + (cols[7] ? '\n\n' + cols[7] : ''))
    const noteMd = [note, note2].filter(Boolean).join('\n\n') || null
    const programMd = program || null

    const keyPath = pathTitle
    if (!byPath.has(keyPath)) byPath.set(keyPath, { slug: slugify(keyPath) || 'onboarding-week', title: keyPath, items: [] })
    const pdKey = `${keyPath}|${day == null ? 'X' : day}`
    const pos = (posMap.get(pdKey) || 0) + 1
    posMap.set(pdKey, pos)
    byPath.get(keyPath)!.items.push({ day, title, programMd, noteMd, trainer, attachments: attach, position: pos })
  }

  // Deterministic order by title
  const data = Array.from(byPath.values()).sort((a,b) => a.title.localeCompare(b.title))

  const ts = `// data/learningPaths.ts\nexport default ${JSON.stringify(data, null, 2)} as const;\n`
  await fs.writeFile(outPath, ts, 'utf8')
  console.log(`Wrote ${outPath} with ${data.length} paths.`)
}

main().catch((e) => { console.error(e); process.exit(1) })

