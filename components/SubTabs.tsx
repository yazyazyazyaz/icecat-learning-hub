"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

export default function SubTabs() {
  const pathname = usePathname() || ""
  const sp = useSearchParams()

  let items: { href: string; label: string }[] = []
  if (pathname.startsWith("/presentations")) {
    const tag = sp.get("tag") || ""
    items = [
      { href: "/presentations", label: "All" },
      { href: "/presentations?tag=retailers", label: "For Retailers" },
      { href: "/presentations?tag=brands", label: "For Brands" },
    ]
  } else if (pathname.startsWith("/training")) {
    items = [
      { href: "/training?plan=onboarding&tab=overview", label: "Onboarding" },
      { href: "/training?plan=onboarding&tab=lessons", label: "Lessons" },
      { href: "/training?plan=onboarding&tab=quizzes", label: "Quizzes" },
      { href: "/training?plan=onboarding&tab=progress", label: "Progress" },
    ]
  } else {
    return null
  }

  return (
    <div className="sticky top-[calc(var(--header-h)+44px)] z-20 bg-[hsl(var(--bg))]/90 border-b border-[hsl(var(--border))]">
      <nav className="mx-auto max-w-7xl overflow-x-auto scrollbar-none">
        <ul className="flex gap-2 px-4">
          {items.map((it) => {
            const selected = pathname.startsWith(it.href.split("?")[0]) && (it.href.includes("?") ? locationSearchEquals(sp, it.href) : true)
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    "inline-flex h-10 items-center rounded-t-md px-3 text-sm",
                    selected ? "border-b-2 border-[hsl(var(--accent))]" : "text-neutral-600 hover:text-[hsl(var(--fg))]"
                  )}
                >
                  {it.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

function locationSearchEquals(sp: URLSearchParams, href: string) {
  try {
    const q = href.split("?")[1]
    if (!q) return true
    const target = new URLSearchParams(q)
    for (const [k, v] of target.entries()) {
      if (sp.get(k) !== v) return false
    }
    return true
  } catch {
    return false
  }
}
