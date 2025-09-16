"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Presentation,
  Folder,
  HelpCircle,
  GraduationCap,
  LayoutDashboard,
  Wand2,
  Link2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  sub?: { href: string; label: string }[]
}

const navItems: NavItem[] = [
  { href: "/", label: "Homepage", icon: LayoutDashboard },
  { href: "/manuals", label: "Manuals", icon: BookOpen },
  {
    href: "/presentations",
    label: "Presentations",
    icon: Presentation,
    sub: [
      { href: "/presentations?tag=For%20Retailers", label: "For Retailers" },
      { href: "/presentations?tag=For%20Brands", label: "For Brands" },
      { href: "/presentations?tag=Icecat%20Commerce", label: "Icecat Commerce" },
      { href: "/presentations?tag=Amazon", label: "Amazon" },
    ],
  },
  { href: "/documents", label: "Documents", icon: Folder },
  { href: "/integration", label: "Integration Files", icon: Link2 },
  {
    href: "/onboarding",
    label: "Onboarding",
    icon: GraduationCap,
    sub: [
      { href: "/onboarding", label: "Training Program" },
      { href: "/quizzes", label: "Quizzes" },
    ],
  },
  { href: "/wizard", label: "Wizard", icon: Wand2 },
]

export function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as string | undefined
  const isEditorRole = role === 'TRAINER' || role === 'EDITOR'

  const items = navItems.filter((item) => {
    if (item.href.startsWith('/editor')) return role === 'ADMIN' || isEditorRole
    if (item.href.startsWith('/admin')) return role === 'ADMIN'
    return true
  })
  return (
    <aside className={cn("h-full w-full p-2", className)} aria-label="Primary">
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm max-w-[13rem] mx-auto">
        <nav className="grid gap-2">
          {items.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname?.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 transition-colors transform",
                  "hover:translate-x-0.5",
                  active
                    ? "font-semibold text-neutral-900"
                    : "text-neutral-800 hover:text-neutral-900"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-[18px] w-[18px] text-neutral-800" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        {role === 'ADMIN' && (
          <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] space-y-2">
            <Link
              href="/editor"
              className={cn(
                "block text-center px-3 py-2 rounded-xl text-sm font-medium",
                "bg-emerald-700 text-white hover:bg-emerald-800"
              )}
            >
              Editor Panel
            </Link>
            <Link
              href="/admin"
              className={cn(
                "block text-center px-3 py-2 rounded-xl text-sm font-medium",
                "bg-neutral-900 text-white hover:bg-neutral-800"
              )}
            >
              Admin Panel
            </Link>
          </div>
        )}
        {isEditorRole && role !== 'ADMIN' && (
          <div className="mt-4 pt-3 border-t border-[hsl(var(--border))]">
            <Link
              href="/editor"
              className={cn(
                "block text-center px-3 py-2 rounded-xl text-sm font-medium",
                "bg-emerald-700 text-white hover:bg-emerald-800"
              )}
            >
              Editor Panel
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}

export { navItems }
