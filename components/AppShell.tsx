"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/Header"
import { Sidebar } from "@/components/Sidebar"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname === "/signin" || pathname === "/register"

  if (isAuth) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 rounded-md bg-white px-3 py-2 text-sm shadow"
      >
        Skip to content
      </a>
      <Header />
      <div className="w-full grid grid-cols-1 md:grid-cols-[14rem_1fr] gap-x-4 px-2">
        <aside className="hidden md:block sticky top-[var(--header-h)] relative z-30">
          <div className="h-[calc(100vh-var(--header-h))] overflow-y-auto pt-3 md:pt-4 animate-in slide-in-from-left duration-300">
            <Sidebar className="w-full p-0" />
          </div>
        </aside>
        <div>
          <main id="main" className="min-h-[calc(100vh-var(--header-h))] px-4 py-6 text-[15px] animate-in fade-in-0 duration-300">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
