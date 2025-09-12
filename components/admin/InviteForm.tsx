"use client"

import { useFormState, useFormStatus } from "react-dom"
import { createInviteAction } from "@/actions/invites"

type State = { ok?: boolean; link?: string; token?: string; error?: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      disabled={pending}
      className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60 disabled:opacity-50"
    >
      {pending ? "Creating…" : "Create invite"}
    </button>
  )
}

export default function InviteForm() {
  const [state, formAction] = useFormState<State, FormData>(createInviteAction as any, {})

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-5 items-end">
      <div>
        <label className="block text-sm mb-1">Role</label>
        <select name="role" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm">
          <option value="ADMIN">Admin</option>
          <option value="TRAINER">Editor</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Email (optional)</label>
        <input name="email" placeholder="invitee@company.com" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm mb-1">Valid (days)</label>
        <input name="days" type="number" min={1} max={90} defaultValue={14} className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm" />
      </div>
      <div>
        <SubmitButton />
      </div>
      <div className="md:col-span-5">
        {state?.link && (
          <div className="text-sm">
            <span className="font-medium">Invite link: </span>
            <a className="underline break-all" href={state.link} target="_blank" rel="noreferrer">{state.link}</a>
          </div>
        )}
      </div>
    </form>
  )
}
