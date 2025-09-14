"use client"

export default function ToggleDetails({ targetId, label = "Edit", className = "px-3 py-1 rounded-full border text-xs" }: { targetId: string; label?: string; className?: string }) {
  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const el = document.getElementById(targetId) as HTMLDetailsElement | null
    if (!el) return
    el.open = !el.open
    if (el.open) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
  return (
    <button type="button" onClick={onClick} className={className} aria-controls={targetId}>
      {label}
    </button>
  )
}

