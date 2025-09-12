"use client"

import { useEffect, useState } from "react"
import { Lightbulb, LightbulbOff } from "lucide-react"

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    // Initialize from localStorage or prefers-color-scheme
    const saved = localStorage.getItem("theme-dark")
    const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'true' || (saved === null && prefers)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme-dark', String(next))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2"
      title={dark ? 'Dark mode' : 'Light mode'}
    >
      {dark ? <LightbulbOff className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
    </button>
  )
}
