import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookOpen, Presentation, Folder, HelpCircle, GraduationCap, LayoutDashboard } from 'lucide-react'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const isAuthed = Boolean(session?.user)
  let trainingCount = 0, lessonCount = 0, quizCount = 0
  try {
    const counts = await Promise.all([
      db.training.count().catch(()=>0),
      db.lesson.count().catch(()=>0),
      db.quiz.count().catch(()=>0),
    ])
    trainingCount = Number(counts[0]||0)
    lessonCount = Number(counts[1]||0)
    quizCount = Number(counts[2]||0)
  } catch {}

  // Continue where you left off
  let nextLesson: { title: string; slug: string } | null = null
  if (isAuthed) {
    try {
      const allLessons = await db.lesson.findMany({ orderBy: { order: 'asc' } })
      const userId = (session?.user as any)?.id as string
      const progress = await db.progress.findMany({ where: { userId } })
      const completedIds = new Set(progress.filter(p => p.isCompleted).map(p => p.lessonId))
      const pending = allLessons.find(l => !completedIds.has(l.id))
      if (pending) nextLesson = { title: pending.title, slug: pending.slug }
    } catch {}
  }

  const quick = [
    { href: '/', label: 'Homepage', icon: LayoutDashboard },
    { href: '/manuals', label: 'Manuals', icon: BookOpen },
    { href: '/presentations', label: 'Presentations', icon: Presentation },
    { href: '/files', label: 'Documents', icon: Folder },
    { href: '/quizzes', label: 'Quizzes', icon: HelpCircle },
    { href: '/training', label: 'Training', icon: GraduationCap },
  ]

  return (
    <div className="grid gap-8">
      {/* Hero + copy */}
      <div className="grid gap-8">
        <section className="rounded-2xl border border-[hsl(var(--border))] p-8 md:p-10" style={{ background: 'linear-gradient(180deg, hsla(var(--surface)), hsla(var(--surface))/0.85)' }}>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Learn. Train. Assess.</h1>
          <p className="text-muted mt-3 max-w-prose">A minimal hub for Icecat training and knowledge. Manuals, presentations, hands‑on lessons and short quizzes — all in one place.</p>
          <div className="mt-6 flex gap-3">
            {isAuthed ? (
              <>
                <Link href="/" className="inline-flex items-center rounded-2xl bg-[hsl(var(--fg))] text-white px-5 py-2.5 text-sm">Go to Homepage</Link>
                <Link href="/training" className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-5 py-2.5 text-sm hover:bg-[hsl(var(--accent))]/10 dark:hover:bg-white/10">Browse Training</Link>
              </>
            ) : (
              <>
                <Link href="/signin" className="inline-flex items-center rounded-2xl bg-[hsl(var(--fg))] text-white px-5 py-2.5 text-sm">Sign in</Link>
                <Link href="/register" className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-5 py-2.5 text-sm hover:bg-[hsl(var(--accent))]/10 dark:hover:bg-white/10">Create account</Link>
              </>
            )}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-md text-sm text-muted">
            <div><span className="text-[hsl(var(--fg))] font-medium">{trainingCount}</span> trainings</div>
            <div><span className="text-[hsl(var(--fg))] font-medium">{lessonCount}</span> lessons</div>
            <div><span className="text-[hsl(var(--fg))] font-medium">{quizCount}</span> quizzes</div>
          </div>
        </section>

        {nextLesson && (
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-5">
            <h2 className="text-sm font-medium mb-2">Continue where you left off</h2>
            <Link className="underline" href={`/lessons/${nextLesson.slug}`}>{nextLesson.title}</Link>
          </section>
        )}

        <section className="soft-section">
          <h2 className="text-xl font-medium heading-underline">How it works</h2>
          <div className="mt-3 grid gap-2 text-muted">
            <p>Start with Training to follow curated modules. Open Manuals for standards and SOPs. Use Presentations for team updates. Check Files hub for shared assets. Validate knowledge with Quizzes.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
