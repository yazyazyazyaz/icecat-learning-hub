"use client"

import Link from "next/link"

export default function LinkActions({ href }: { href?: string }) {
  const url = String(href || "").trim()
  if (!url) return <span className="text-neutral-400">—</span>

  const isExternal = /^https?:\/\//i.test(url)

  const classes = "inline-flex items-center gap-2 justify-end"
  const btn =
    "px-2 py-0.5 text-xs rounded-full border hover:bg-neutral-50 text-neutral-700" as const

  return (
    <div className={classes}>
      {isExternal ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={btn}>
          Open
        </a>
      ) : (
        <Link href={url} className={btn} prefetch={false}>
          Open
        </Link>
      )}
    </div>
  )
}

