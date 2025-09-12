"use client"

import { useState, useTransition } from "react"
import { registerUser } from "@/actions/users"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function RegisterInner() {
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [isPending, start] = useTransition()
  const sp = useSearchParams()
  const invite = sp.get('invite') || ''

  function onSubmit(formData: FormData) {
    const name = String(formData.get("name") || "")
    const jobFunction = String(formData.get("jobFunction") || "")
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")
    const invite = String(formData.get("invite") || "")
    start(async () => {
      setError(null)
      const res = await registerUser({ name, jobFunction, email, password, invite })
      if (!res.ok) setError(res.error || "Registration failed")
      else setOk(true)
    })
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-sm text-[15px]">
      <h1 className="text-2xl font-semibold mb-4">Create account</h1>
      {ok ? (
        <div className="text-sm">
          <p className="mb-2">Thanks! Your registration was received.</p>
          <p className="text-neutral-600">An admin will approve your account. You can sign in after approval.</p>
          <div className="mt-4"><Link className="underline" href="/signin">Back to sign in</Link></div>
        </div>
      ) : (
        <form action={onSubmit} className="grid gap-4">
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <Input name="name" placeholder="Jane Doe" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Function</label>
            <Input name="jobFunction" placeholder="e.g. Product Manager" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <Input name="email" type="email" placeholder="you@company.com" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <Input name="password" type="password" required />
          </div>
          {invite && (
            <div className="text-xs text-neutral-600">Registering with invite token.</div>
          )}
          <input type="hidden" name="invite" value={invite} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button disabled={isPending}>Register</Button>
          <p className="text-xs text-neutral-600">Accounts require admin approval before access.</p>
        </form>
      )}
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterInner />
    </Suspense>
  )
}
