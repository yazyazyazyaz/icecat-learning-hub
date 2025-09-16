"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sidebar } from "@/components/Sidebar"
import Logo from "@/components/Logo"
import { useSession, signIn } from "next-auth/react"
import CommandPalette from "@/components/CommandPalette"
import UserMenu from "@/components/UserMenu"

export default function Header() {
  const [open, setOpen] = useState(false)
  const { data: session, status } = useSession()
  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-[hsl(var(--bg))]/90">
      <div className="flex h-[var(--header-h)] items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="p-4 border-b border-[hsl(var(--border))]">
              <Link href="/" className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                <Logo className="h-8 w-8" />
                <span>Icecat Learning Hub</span>
              </Link>
            </div>
            <Sidebar className="h-[calc(100vh-57px)]" />
          </SheetContent>
        </Sheet>
        <Link href="/" className="hidden md:inline text-sm font-medium text-neutral-900">
          <span className="inline-flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span>Icecat Learning Hub</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <CommandPalette />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
