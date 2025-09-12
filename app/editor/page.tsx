import Link from 'next/link'

const items = [
  { href: '/editor/presentations', label: 'Presentations', desc: 'Upload files or save links' },
  { href: '/editor/documents', label: 'Documents', desc: 'Upload documents and assets' },
  { href: '/editor/manuals', label: 'Manuals', desc: 'Add manuals via links' },
  { href: '/editor/quizzes', label: 'Quizzes', desc: 'Create and manage quizzes' },
  { href: '/editor/lessons', label: 'Lessons', desc: 'Create and edit lessons' },
]

export default function EditorHome() {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-0 overflow-hidden">
        <ul className="divide-y divide-[hsl(var(--border))]">
          {items.map(({ href, label, desc }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-4 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2"
              >
                <div className="flex-1">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs text-neutral-600">{desc}</div>
                </div>
                <span aria-hidden className="text-neutral-400">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

