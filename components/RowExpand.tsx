"use client"

import { useState } from "react"

export default function RowExpand({
  buttonText = "Edit",
  buttonClass = "px-3 py-1 rounded-full border text-xs",
  span = 4,
  children,
}: {
  buttonText?: string
  buttonClass?: string
  span?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const spanClass = `col-span-${span}` as const
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {buttonText}
      </button>
      <div
        className={`${spanClass} overflow-hidden border-t border-[hsl(var(--border))] bg-neutral-50 transition-all duration-300 ${open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        {children}
      </div>
    </>
  )
}

