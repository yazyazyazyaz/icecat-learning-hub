"use client"

import { useState } from "react"

export default function DetailTitle({
  title,
  desc,
  openDesc,
  fullDesc,
  className = "",
}: {
  title: string
  desc?: string | null
  openDesc?: string | null
  fullDesc?: string | null
  className?: string
}) {
  const [show, setShow] = useState(false)
  const hasDesc = Boolean(desc || openDesc || fullDesc)
  if (!hasDesc) return <span className={className} title={title}>{title}</span>
  return (
    <span
      className={`relative ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        type="button"
        className="truncate hover:underline"
        onClick={() => setShow((v) => !v)}
        aria-expanded={show}
        title={title}
      >
        {title}
        <span aria-hidden>{hasDesc ? '*' : ''}</span>
      </button>
      {show && (
        <div
          className="absolute left-0 mt-2 w-[26rem] z-10 rounded-xl border border-[hsl(var(--border))] bg-white p-3 shadow-lg text-left"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {desc ? (
            <p className="text-xs text-neutral-700 whitespace-pre-wrap">{desc}</p>
          ) : (
            <div className="space-y-2">
              {openDesc && (
                <p className="text-xs text-neutral-700 whitespace-pre-wrap">{openDesc}</p>
              )}
              {fullDesc && (
                <p className="text-xs text-neutral-700 whitespace-pre-wrap"><span className="font-semibold">Full:</span> {fullDesc}</p>
              )}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
