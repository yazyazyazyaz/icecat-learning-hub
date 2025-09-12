"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Breadcrumbs() {
  const pathname = usePathname()
  const parts = (pathname || "/").split("/").filter(Boolean)
  const toTitle = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
  const crumbs = parts.map((p, idx) => {
    const href = "/" + parts.slice(0, idx + 1).join("/")
    const raw = decodeURIComponent(p.replace(/\[(.*)\]/, "$1")).replace(/-/g, " ")
    const label = toTitle(raw)
    return { href, label }
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-7xl px-4 py-2">
      <ol className="flex items-center gap-2 text-sm text-neutral-600">
        <li><Link href="/" className="hover:underline">Home</Link></li>
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            <span aria-hidden>›</span>
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="text-neutral-800">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:underline">{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
