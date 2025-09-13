"use client"

import { useState } from 'react'

export default function LinkActions({ href }: { href: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="inline-flex items-center gap-2 whitespace-nowrap">
      <button type="button" onClick={copy} className="px-2 py-1 rounded-full border text-xs">
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <a href={href} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-full border text-xs">
        Download
      </a>
    </div>
  )
}
