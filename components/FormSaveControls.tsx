"use client"

import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { Hourglass } from "lucide-react"

export function SubmitButton({ label="Save", pendingLabel="Saving...", className="" }: { label?: string; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`px-3 py-1 rounded-full border text-sm inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {pending && <Hourglass className="w-4 h-4 animate-spin text-emerald-700 dark:text-sky-400" />}
      {pending ? pendingLabel : label}
    </button>
  )
}

export function SaveStatus({ className="" }: { className?: string }) {
  const { pending } = useFormStatus()
  const [show, setShow] = useState(false)
  const prev = useRef(pending)
  useEffect(() => {
    if (prev.current && !pending) {
      setShow(true)
      const t = setTimeout(() => setShow(false), 2000)
      return () => clearTimeout(t)
    }
    prev.current = pending
  }, [pending])
  if (!show) return null
  return (
    <span className={`px-2 py-1 rounded-full border text-xs border-emerald-200 bg-emerald-50 text-emerald-900 ${className}`}>Saved</span>
  )
}

