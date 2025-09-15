/* scripts/generate_quizzes_from_content.ts
   Generates 50 quizzes (20 Easy, 20 Medium, 10 Hard), each with 10 MCQ questions,
   based on content in Presentations, Manuals (Uploads with tag 'manual'), Documents,
   and Integration Files (Index/Reference tags). Also includes a fixed set of Icelog manuals.
*/
import { PrismaClient, QuestionType } from '@prisma/client'

const prisma = new PrismaClient()

type Res = { kind: 'presentation'|'manual'|'document'|'integration'; id?: string; title: string; url: string; tags?: string[] }

const EXTRA_MANUALS: Res[] = [
  { kind: 'manual', title: 'Manual for Icecat JSON product requests', url: 'https://iceclog.com/manual-for-icecat-json-product-requests/' },
  { kind: 'manual', title: 'Open Catalog Interface (OCI): XML repositories', url: 'https://iceclog.com/open-catalog-interface-oci-open-icecat-xml-and-full-icecat-xml-repositories/' },
  { kind: 'manual', title: 'Manuals CSV interface', url: 'https://iceclog.com/manuals-csv-interface/' },
  { kind: 'manual', title: 'Which JSON and XML error messages can I get?', url: 'https://iceclog.com/which-json-and-xml-error-messages-can-i-get-using-icecat/' },
  { kind: 'manual', title: 'Related products in XML and JSON', url: 'https://iceclog.com/related-products-in-icecat-xml-and-json-data-channel/' },
  { kind: 'manual', title: 'Icecat Live — real-time product data', url: 'https://iceclog.com/icecat-live-real-time-product-data-in-your-app/' },
  { kind: 'manual', title: 'Icecat Live — granular call', url: 'https://iceclog.com/manual-icecat-live-for-granular-call/' },
  { kind: 'manual', title: 'Product Story manual: embed rich content', url: 'https://iceclog.com/product-story-manual-how-to-embed-rich-content-into-your-website/' },
  { kind: 'manual', title: 'Create custom play button using LiveJS API', url: 'https://iceclog.com/create-custom-play-button-for-video-using-livejs-api/' },
  { kind: 'manual', title: 'Manual for Icecat Push API', url: 'https://iceclog.com/manual-for-icecat-push-api-api-in/' },
  { kind: 'manual', title: 'Media API manual', url: 'https://iceclog.com/media-api-manual/' },
  { kind: 'manual', title: 'User Media API (reference)', url: 'https://api.icecat.biz/#/UserMedia' },
  { kind: 'manual', title: 'Manual for Reference Files', url: 'https://iceclog.com/manual-for-reference-files/' },
  { kind: 'manual', title: 'How to filter files (Index CSV)', url: 'https://iceclog.com/manual-how-to-filter-files-index-csv/' },
  { kind: 'manual', title: 'Product XMLs batch processing', url: 'https://iceclog.com/manual-icecat-product-xmls-batch-processing/' },
  { kind: 'manual', title: 'Full index files per vertical', url: 'https://iceclog.com/full-index-files-per-vertical-on-en-and-nl-locales-in-icecat-catalog/' },
  { kind: 'manual', title: 'Downloading image libraries', url: 'https://iceclog.com/manual-downloading-image-libraries/' },
  { kind: 'manual', title: 'How to host your product feed', url: 'https://iceclog.com/how-to-host-your-product-feed/' },
  { kind: 'manual', title: 'Import product content into your webshop', url: 'https://iceclog.com/manual-how-to-import-product-content-into-your-webshop-via-icecat/' },
  { kind: 'manual', title: 'Icecat Add-ons and partners', url: 'https://iceclog.com/icecat-add-ons-for-popular-solutions-and-implementation-partners/' },
  { kind: 'manual', title: 'Shopify connector', url: 'https://iceclog.com/product-content-integration-with-an-icecat-shopify-connector/' },
  { kind: 'manual', title: 'WooCommerce connector for Smart Click', url: 'https://iceclog.com/woocommerce-connector-for-smart-click/' },
  { kind: 'manual', title: 'Download unenriched product list (WooCommerce)', url: 'https://iceclog.com/download-unenriched-product-list-with-iceshop-woocommerce-connector/' },
  { kind: 'manual', title: 'Open source Magento2 extension', url: 'https://iceclog.com/open-source-magento2-extension-v1-is-live/' },
  { kind: 'manual', title: 'Amazon Listing API', url: 'https://iceclog.com/manual-for-amazons-listing-api/' },
  { kind: 'manual', title: 'Social media functionalities on Iceclog', url: 'https://iceclog.com/icecat-implements-social-media-functionalities-on-iceclog-com/' },
  { kind: 'manual', title: 'Open Content License', url: 'https://iceclog.com/open-content-license/' },
  { kind: 'manual', title: 'Open Icecat fair-use policy', url: 'https://iceclog.com/open-icecat-fair-use-policy/' },
]

function domain(u: string) {
  try { return new URL(u).hostname.replace(/^www\./,'') } catch { return '' }
}
function ext(u: string) {
  try { const p = new URL(u); const name = p.pathname.split('/').pop() || ''; const e = name.replace(/\.gz$/i,'').split('.').pop() || ''; return e.toLowerCase() } catch { return '' }
}

async function collectResources(): Promise<Res[]> {
  const out: Res[] = []
  try {
    const pres = await prisma.presentation.findMany({ select: { id:true, title:true, path:true, tags:true } })
    for (const p of pres) out.push({ kind: 'presentation', id: p.id, title: p.title, url: p.path, tags: p.tags || [] })
  } catch {}
  try {
    const docs = await (prisma as any).documentFile.findMany({ select: { id:true, title:true, path:true, tags:true } })
    for (const d of docs) {
      const isIntegration = Array.isArray(d.tags) && (d.tags.includes('Index File') || d.tags.includes('Reference File'))
      out.push({ kind: isIntegration ? 'integration' : 'document', id: d.id, title: d.title, url: d.path, tags: d.tags || [] })
    }
  } catch {}
  try {
    const uploads = await prisma.upload.findMany({ select: { id:true, title:true, path:true, tags:true, kind:true } })
    for (const u of uploads) {
      const isManual = (u.tags || []).includes('manual')
      const isIntegration = (u.tags || []).includes('Index File') || (u.tags || []).includes('Reference File')
      out.push({ kind: isManual ? 'manual' : (isIntegration ? 'integration' : 'document'), id: u.id, title: u.title, url: u.path, tags: u.tags || [] })
    }
  } catch {}
  // add extra manuals
  out.push(...EXTRA_MANUALS)
  // filter duplicates by normalized key
  const seen = new Set<string>()
  const dedup: Res[] = []
  for (const r of out) {
    const key = `${r.kind}|${r.title.toLowerCase()}|${r.url.split('#')[0].split('?')[0].toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    dedup.push(r)
  }
  return dedup
}

function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
function pick<T>(arr: T[], n: number): T[] { const a = shuffle(arr); return a.slice(0, Math.min(n, a.length)) }

function genQuestion(r: Res, kindHint?: 'easy'|'medium'|'hard', index?: number) {
  const d = domain(r.url)
  const e = ext(r.url)
  const k = r.kind
  const optionsSet = new Set<string>()
  function withDistractors(correct: string, pool: string[], n=3) {
    const opts = [correct, ...pick(pool.filter(x=>x!==correct), n)]
    return shuffle(opts)
  }
  // Template rotation
  const which = (index ?? 0) % 10
  switch (which) {
    case 0: {
      const pool = ['manual','document','presentation','integration']
      const opts = withDistractors(k, pool)
      return { prompt: `What type best fits “${r.title}”?`, options: opts, correct: k }
    }
    case 1: {
      const isAttachment = r.url.startsWith('/uploads/')
      const correct = isAttachment ? 'Attachment' : 'External link'
      const opts = withDistractors(correct, ['Attachment','External link','PDF viewer','Internal page'])
      return { prompt: `Is this an attachment or an external link? (${r.title})`, options: opts, correct }
    }
    case 2: {
      const correct = (e || 'none').toUpperCase()
      const pool = ['PDF','HTML','CSV','JSON','XML','PPTX','DOCX','ZIP']
      const opts = withDistractors(correct, pool)
      return { prompt: `What is the file format of “${r.title}”?`, options: opts, correct }
    }
    case 3: {
      const correct = d || 'icecat.biz'
      const pool = ['icecat.biz','iceclog.com','api.icecat.biz','github.com','notion.so','wikipedia.org']
      const opts = withDistractors(correct, pool)
      return { prompt: `Which domain hosts this resource? (${r.title})`, options: opts, correct }
    }
    case 4: {
      const correct = 'Pull vs Push'
      const opts = shuffle(['Pull vs Push','Taxonomy','Image CDN','Pricing'])
      return { prompt: `This description refers to Icecat data flow patterns. Which topic is it about?`, options: opts, correct }
    }
    case 5: {
      const correct = 'Icecat Live'
      const opts = shuffle(['Icecat Live','Media API','Manuals CSV','Pipedrive'])
      return { prompt: `Which API helps embed rich content or get real-time data?`, options: opts, correct }
    }
    case 6: {
      const correct = 'Reference File'
      const opts = shuffle(['Reference File','Index File','Brand Cloud','Product Story'])
      return { prompt: `Integration question: Which file type aligns with detailed per‑product specs?`, options: opts, correct }
    }
    case 7: {
      const correct = 'Index File'
      const opts = shuffle(['Index File','Reference File','Manuals CSV','Open Content License'])
      return { prompt: `Integration question: Which file lists product IDs to fetch?`, options: opts, correct }
    }
    case 8: {
      const correct = 'JSON'
      const opts = shuffle(['JSON','XML','CSV','LIVE'])
      return { prompt: `Manual mentions “JSON product requests”. What format is that?`, options: opts, correct }
    }
    default: {
      const correct = 'Open Icecat'
      const opts = shuffle(['Open Icecat','Full Icecat','Sponsor Only','None'])
      return { prompt: `Which scope offers free access to many datasheets?`, options: opts, correct }
    }
  }
}

async function main() {
  const resources = await collectResources()
  if (resources.length === 0) {
    console.log('No resources found; only extra manuals will be used')
  }
  const levels = [
    ...Array.from({length:20},()=> 'Easy' as const),
    ...Array.from({length:20},()=> 'Medium' as const),
    ...Array.from({length:10},()=> 'Hard' as const),
  ]
  let qi = 0
  for (let i=0;i<levels.length;i++) {
    const level = levels[i]
    const title = `Onboarding ${level} Quiz ${level==='Easy'? i+1 : level==='Medium'? i-19 : i-39}`
    const quiz = await prisma.quiz.create({ data: { title, description: `Auto‑generated ${level} quiz`, passThreshold: 70, timeLimitSeconds: level==='Hard'? 600 : level==='Medium'? 480 : 300 } })
    const pool = resources.length ? pick(resources, Math.min(20, resources.length)) : EXTRA_MANUALS
    for (let j=0;j<10;j++) {
      const r = pool[(j) % pool.length]
      const q = genQuestion(r, level.toLowerCase() as any, j)
      await prisma.question.create({
        data: {
          quizId: quiz.id,
          type: QuestionType.SINGLE,
          prompt: q.prompt,
          options: q.options,
          correct: [q.correct],
          order: j+1,
        }
      })
      qi++
    }
  }
  console.log(`Created ${levels.length} quizzes with ${qi} questions total.`)
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

