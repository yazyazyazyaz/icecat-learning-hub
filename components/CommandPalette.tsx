"use client"

import * as React from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { navItems } from "@/components/Sidebar"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

export default function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [query, setQuery] = React.useState("")
  const { data: session } = useSession()

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const hasMod = e.metaKey || e.ctrlKey
      if (hasMod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((x) => !x)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else setQuery("")
  }, [open])

  const role = (session?.user as any)?.role
  const isAdmin = role === 'ADMIN'
  const isEditor = role === 'TRAINER'
  const adminItems = (isAdmin || isEditor)
    ? [
        { label: isAdmin ? 'Admin' : 'Editor', href: '/admin' },
        { label: 'Presentations (Admin)', href: '/admin/presentations' },
        { label: 'Manuals (Admin)', href: '/admin/manuals' },
        { label: 'Documents (Admin)', href: '/files' },
        { label: 'Quizzes (Admin)', href: '/admin/quizzes' },
        ...(isAdmin ? [{ label: 'Users (Admin)', href: '/admin/users' } as const] : []),
      ]
    : []
  const userItems = role === 'EMPLOYEE' ? [{ label: 'User', href: '/user' }] : []

  const items = [...navItems.map((n) => ({ label: n.label, href: n.href })), ...adminItems, ...userItems]
    .filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label="Search" className="md:hidden">
        <Search className="h-4 w-4" />
        <span className="ml-2">Search</span>
      </Button>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-24 z-50 w-[90vw] max-w-xl -translate-x-1/2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-md outline-none"
        )}>
          <div className="border-b border-[hsl(var(--border))] p-3">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages… (Ctrl/Cmd + K)"
              className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-500">No results</li>
            )}
            {items.map((i) => (
              <li key={i.href}>
                <Link
                  href={i.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 text-sm hover:bg-neutral-100"
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
