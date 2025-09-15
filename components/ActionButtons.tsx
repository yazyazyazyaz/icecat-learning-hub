"use client"

import { useState } from "react"

type LinkItem = { label: string; href: string }

export default function ActionButtons({ links, desc, openDesc, fullDesc, favicon, labelMode }: { links: LinkItem[]; desc?: string | null; openDesc?: string | null; fullDesc?: string | null; favicon?: string; labelMode?: 'download' | 'label' }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function onCopy(href: string) {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(href)
      setTimeout(() => setCopied((v) => (v === href ? null : v)), 1500)
    } catch {}
  }

  return (
    <div className="inline-flex items-center gap-3">
      {links.map((l) => (
        <div key={l.label} className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(l.href)}
            className="px-2 py-0.5 rounded-full border text-[10px] hover:bg-neutral-50"
            aria-label={`Copy ${l.label} link`}
            title="Copy URL"
          >
            {copied === l.href ? "Copied" : "Copy"}
          </button>
          <a
            className="px-2 py-0.5 rounded-full border text-[10px] hover:bg-neutral-50 inline-flex items-center gap-2"
            href={l.href}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
          >
            {(() => { const f = favicon || faviconForUrl(l.href); return f ? <img src={f} alt="" width={14} height={14} className="inline-block rounded-sm" /> : null })()}
            <span>{labelMode === 'label' ? l.label : (links.length > 1 ? `Download (${l.label})` : 'Download')}</span>
          </a>
        </div>
      ))}
    </div>
  )
}

function faviconForUrl(url: string): string | null {
  try {
    const isAbsolute = /^https?:\/\//i.test(url)
    if (!isAbsolute) return null
    const u = new URL(url)
    const domain = u.hostname
    if (!domain) return null
    return `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
  } catch {
    return null
  }
}
