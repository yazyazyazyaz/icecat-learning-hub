"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/editor/presentations", label: "Presentations" },
  { href: "/editor/documents", label: "Documents" },
  { href: "/editor/integration", label: "Integration Files" },
  { href: "/editor/manuals", label: "Manuals" },
  { href: "/editor/onboarding", label: "Onboarding" },
  { href: "/editor/quizzes", label: "Quizzes" },
]

export default function EditorNav() {
  const pathname = usePathname() || ""
  return (
    <div className="sticky top-[var(--header-h)] z-20 bg-[hsl(var(--bg))]/90 border-b border-[hsl(var(--border))]">
      <nav className="mx-auto w-full max-w-7xl overflow-x-auto scrollbar-none">
        <ul className="flex items-center gap-2 px-4 h-12">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/")
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  prefetch={false}
                  className={cn(
                    "inline-flex h-10 items-center rounded-t-md px-3 text-sm",
                    active ? "border-b-2 border-[hsl(var(--accent))] text-[hsl(var(--fg))]" : "text-neutral-600 hover:text-[hsl(var(--fg))]"
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
