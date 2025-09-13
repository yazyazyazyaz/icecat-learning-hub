"use client"

import LinkActions from '@/components/LinkActions'

function formatFromURL(path: string) {
  try {
    const name = (path || '').split('/').pop() || ''
    const noGz = name.replace(/\.gz$/i, '')
    const ext = (noGz.split('.').pop() || '').toUpperCase()
    return ext || ''
  } catch { return '' }
}

export default function IntegrationRowPublic({ title, path, tags }: { title: string; path: string; tags: string[] }) {
  const format = formatFromURL(path)
  const isOpen = tags?.includes('refscope:open')
  const isFull = tags?.includes('refscope:full')
  const scopeLabel = isOpen ? 'Open Icecat' : (isFull ? 'Full Icecat' : '—')
  const dotColor = isOpen ? 'bg-emerald-600' : isFull ? 'bg-sky-600' : 'bg-neutral-400'

  return (
    <li className="grid grid-cols-[1fr_12rem_8rem_16rem] items-center text-sm">
      <div className="py-2 px-3 text-neutral-900 truncate" title={title}>{title}</div>
      <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700">
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border align-middle">
          <span className={`h-2 w-2 rounded-full ${dotColor}`}></span>
          {scopeLabel}
        </span>
      </div>
      <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700"><code className="px-1.5 py-0.5 rounded bg-neutral-100 font-mono text-[12px]">{format}</code></div>
      <div className="py-2 px-3 border-l border-[hsl(var(--border))] text-neutral-700 inline-flex items-center gap-2">
        <LinkActions href={path} />
      </div>
    </li>
  )
}
