"use client"

import { useState } from "react"

export default function ConfirmDelete({
  className = "px-3 py-1 rounded-full border text-xs hover:bg-red-50",
  prompt = "Are you sure?",
  yesLabel = "Yes",
  noLabel = "No",
  formAction,
}: {
  className?: string
  prompt?: string
  yesLabel?: string
  noLabel?: string
  // Optional server action for cases without a wrapping <form action>
  formAction?: (formData: FormData) => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setConfirming(true) }}
        className={className}
      >
        Delete
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs text-neutral-700">{prompt}</span>
      {formAction ? (
        <button className="px-2 py-1 rounded-full border text-xs bg-red-50 hover:bg-red-100" formAction={formAction}>{yesLabel}</button>
      ) : (
        <button className="px-2 py-1 rounded-full border text-xs bg-red-50 hover:bg-red-100" type="submit">{yesLabel}</button>
      )}
      <button
        type="button"
        className="px-2 py-1 rounded-full border text-xs hover:bg-neutral-50"
        onClick={(e) => { e.preventDefault(); setConfirming(false) }}
      >
        {noLabel}
      </button>
    </span>
  )
}

