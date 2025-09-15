import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const URLS: string[] = [
  'https://iceclog.com/manual-for-icecat-json-product-requests/',
  'https://iceclog.com/open-catalog-interface-oci-open-icecat-xml-and-full-icecat-xml-repositories/',
  'https://iceclog.com/manuals-csv-interface/',
  'https://iceclog.com/which-json-and-xml-error-messages-can-i-get-using-icecat/',
  'https://iceclog.com/related-products-in-icecat-xml-and-json-data-channel/',
  'https://iceclog.com/icecat-live-real-time-product-data-in-your-app/',
  'https://iceclog.com/manual-icecat-live-for-granular-call/',
  'https://iceclog.com/product-story-manual-how-to-embed-rich-content-into-your-website/',
  'https://iceclog.com/create-custom-play-button-for-video-using-livejs-api/',
  'https://iceclog.com/manual-for-icecat-push-api-api-in/',
  'https://iceclog.com/media-api-manual/',
  'https://api.icecat.biz/#/UserMedia',
  'https://iceclog.com/manual-for-reference-files/',
  'https://iceclog.com/manual-how-to-filter-files-index-csv/',
  'https://iceclog.com/manual-icecat-product-xmls-batch-processing/',
  'https://iceclog.com/full-index-files-per-vertical-on-en-and-nl-locales-in-icecat-catalog/',
  'https://iceclog.com/manual-downloading-image-libraries/',
  'https://iceclog.com/how-to-host-your-product-feed/',
  'https://iceclog.com/manual-how-to-import-product-content-into-your-webshop-via-icecat/',
  'https://iceclog.com/icecat-add-ons-for-popular-solutions-and-implementation-partners/',
  'https://iceclog.com/product-content-integration-with-an-icecat-shopify-connector/',
  'https://iceclog.com/woocommerce-connector-for-smart-click/',
  'https://iceclog.com/download-unenriched-product-list-with-iceshop-woocommerce-connector/',
  'https://iceclog.com/open-source-magento2-extension-v1-is-live/',
  'https://iceclog.com/manual-for-amazons-listing-api/',
  'https://iceclog.com/icecat-implements-social-media-functionalities-on-iceclog-com/',
  'https://iceclog.com/open-content-license/',
  'https://iceclog.com/open-icecat-fair-use-policy/',
]

function deriveTitle(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname === 'api.icecat.biz') return 'User Media API (reference)'
    const slug = u.pathname.replace(/\/$/, '').split('/').pop() || url
    const pretty = slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    return pretty
  } catch { return url }
}

async function main() {
  let created = 0, skipped = 0
  for (const url of URLS) {
    const existing = await prisma.upload.findFirst({ where: { path: url, kind: 'DOCUMENT' as any } })
    if (existing) { skipped++; continue }
    const title = deriveTitle(url)
    await prisma.upload.create({ data: { title, path: url, tags: ['manual'], kind: 'DOCUMENT' as any } })
    created++
  }
  console.log(`Manuals: created ${created}, skipped ${skipped}`)
}

main().catch((e)=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())

