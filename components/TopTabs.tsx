"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { navItems } from "@/components/Sidebar"

export default function TopTabs() {
  const pathname = usePathname()
  return (
    <div className="sticky top-[var(--header-h)] z-30 bg-[hsl(var(--bg))]/90 border-b border-[hsl(var(--border))]">
      <nav
        role="tablist"
        aria-label="Primary"
        className="mx-auto max-w-7xl overflow-x-auto scrollbar-none"
      >
        <ul className="flex items-end divide-x divide-[hsl(var(--border))] px-4">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <li key={item.href} role="presentation" className="first:pl-0 pl-2">
                <Link
                  role="tab"
                  aria-selected={active}
                  href={item.href}
                  className={cn(
                    "inline-flex h-12 items-center rounded-t-xl px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2",
                    active
                      ? "border-b-2 border-[hsl(var(--accent))] text-[hsl(var(--fg))]"
                      : "text-neutral-800 dark:text-neutral-300 hover:text-[hsl(var(--fg))] hover:bg-[hsl(var(--accent))]/10 dark:hover:bg-white/10"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
