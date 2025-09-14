"use client"

import { useState } from "react"

type LinkItem = { label: string; href: string }

export default function ActionButtons({ links }: { links: LinkItem[] }) {
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
            className="px-2 py-0.5 rounded-full border text-[10px] hover:bg-neutral-50"
            href={l.href}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
          >
            {links.length > 1 ? `Download (${l.label})` : "Download"}
          </a>
        </div>
      ))}
    </div>
  )
}
