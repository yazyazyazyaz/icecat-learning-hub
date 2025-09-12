"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"

export default function UserMenu() {
  const { data: session, status } = useSession()
  const name = session?.user?.name ?? session?.user?.email ?? "User"
  const role = (session?.user as any)?.role as string | undefined

  if (status !== "authenticated") {
    return (
      <button
        className="px-3 py-1.5 rounded-full border text-sm hover:bg-neutral-100/60 dark:hover:bg-white/10"
        onClick={() => signIn(undefined, { callbackUrl: "/" })}
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="relative">
      <details className="group">
        <summary className="cursor-pointer text-sm list-none select-none px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 dark:bg-neutral-900 dark:border-white/10">
          {name}
        </summary>
        <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white dark:bg-neutral-900 dark:border-white/10 shadow-lg p-1">
          <Link href="/profile" className="block px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-white/10">Profile</Link>
          <button onClick={() => signOut()} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-white/10">Sign out</button>
        </div>
      </details>
    </div>
  )
}
