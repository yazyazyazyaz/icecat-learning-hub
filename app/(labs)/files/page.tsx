import PageHeading from '@/components/PageHeading'

export default function FilesLabPage() {
  const shop = process.env.NEXT_PUBLIC_ICECAT_SHOPNAME || 'openicecat-live'
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeading title="Index / Reference / Manuals" subtitle="Quick access tiles and wget examples." accent="manuals" />
      <div className="grid sm:grid-cols-2 gap-4">
        <Tile title="Open Icecat" href="https://icecat.biz/en/open-icecat" note="Free catalog: millions of data-sheets.">
          Registration and brand coverage details.
        </Tile>
        <Tile title="JSON Live manual" href="https://iceclog.com/icecat-live-json-api/" note="Headers: api-token, content-token.">
          Granular content and examples.
        </Tile>
        <Tile title="Index files" href="https://iceclog.com/open-icecat-data-model-and-export-tables/" note="Brand lists, languages, taxonomies.">
          CSV/XML/TSV exports documented.
        </Tile>
        <Tile title="Manuals" href="https://iceclog.com/icecat-manuals/" note="XML/CSV manuals and OCI.">
          Downloadable references.
        </Tile>
      </div>

      <section className="mt-6 rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
        <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">wget example</div>
        <pre className="p-3 text-xs whitespace-pre-wrap break-words">{wget(shop)}</pre>
      </section>
    </div>
  )
}

function Tile({ title, href, note, children }: { title: string; href: string; note?: string; children?: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block rounded-lg ring-1 ring-[var(--muted)] p-4 hover:ring-[var(--accent)] transition">
      <div className="text-sm text-slate-500">{note}</div>
      <h3 className="text-lg font-medium text-[var(--fg)]">{title}</h3>
      {children && <p className="text-sm text-slate-600 mt-1">{children}</p>}
    </a>
  )
}

function wget(shop: string) {
  const u = new URL('https://live.icecat.biz/api')
  u.searchParams.set('lang','EN')
  u.searchParams.set('shopname', shop)
  u.searchParams.set('GTIN','0711719709695')
  u.searchParams.set('content','essentialinfo,gallery')
  return [
    'wget --continue \\','  --header "api-token: $ICECAT_API_TOKEN" \\','  --header "content-token: $ICECAT_CONTENT_TOKEN" \\',`  "${u.toString()}"`
  ].join('\n')
}

