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
        className="px-3 py-1.5 rounded-full border text-sm hover:bg-neutral-100"
        onClick={() => signIn(undefined, { callbackUrl: "/" })}
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="relative">
      <details className="group">
        <summary className="cursor-pointer text-sm list-none select-none px-3 py-1.5 rounded-full border bg-white hover:bg-neutral-100 marker:content-none">
          <span className="font-medium text-neutral-900 truncate max-w-[14rem]">{name}</span>
        </summary>
        <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg p-1">
          <Link href="/profile" className="block px-3 py-2 text-sm rounded-lg hover:bg-neutral-100">Profile</Link>
          <button onClick={() => signOut()} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-100">Sign out</button>
        </div>
      </details>
    </div>
  )
}
