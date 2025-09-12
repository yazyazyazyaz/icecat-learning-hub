import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function TrainingProgramPage({ searchParams }: { searchParams?: { plan?: string; tab?: string } }) {
  const plan = (searchParams?.plan || '').toLowerCase()
  const tab = (searchParams?.tab || 'overview').toLowerCase()
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined

  let percent = 0
  let onboardingLessons: { id: string; title: string; slug: string }[] = []
  let onboardingQuiz: { id: string; title: string } | null = null

  if (plan === 'onboarding') {
    try {
      const training = await db.training.findUnique({
        where: { slug: 'onboarding' },
        include: { modules: { include: { lessons: true } }, quizzes: true },
      })
      if (training) {
        onboardingLessons = training.modules.flatMap(m => m.lessons).map(l => ({ id: l.id, title: l.title, slug: l.slug }))
        onboardingQuiz = training.quizzes[0] ?? null
        if (userId) {
          try {
            const prog = await db.progress.findMany({ where: { userId, lessonId: { in: onboardingLessons.map(l => l.id) } } })
            const done = prog.filter(p => p.isCompleted).length
            percent = onboardingLessons.length ? Math.round((done / onboardingLessons.length) * 100) : 0
          } catch {}
        }
      }
    } catch (e) {
      console.error('TrainingProgramPage: DB unavailable', e)
    }
  }

  return (
    <div className="grid gap-6">

      {plan === 'onboarding' ? (
        <>
          <nav aria-label="Onboarding tabs" className="border-b border-[hsl(var(--border))]">
            <ul className="flex gap-4 text-sm">
              {['overview','lessons','quizzes','progress'].map(t => (
                <li key={t}>
                  <Link href={`/training?plan=onboarding&tab=${t}`} className={t===tab ? 'border-b-2 border-[hsl(var(--accent))] pb-2' : 'pb-2 hover:text-[hsl(var(--fg))]'}>
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {tab === 'overview' && (
            <div className="grid gap-4">
              <p className="text-muted max-w-prose">The onboarding plan introduces Icecat, tools, policies, and a short quiz. Work through lessons from top to bottom.</p>
              <div className="max-w-md">
                <h3 className="text-sm font-medium mb-2">Your progress</h3>
                <Progress value={percent} />
                <p className="text-sm text-neutral-600 mt-1">{percent}% complete</p>
              </div>
            </div>
          )}

          {tab === 'lessons' && (
            <ul className="grid gap-2">
              {onboardingLessons.map(l => (
                <li key={l.id}><Link className="underline" href={`/lessons/${l.slug}`}>{l.title}</Link></li>
              ))}
            </ul>
          )}

          {tab === 'quizzes' && (
            <div>
              {onboardingQuiz ? (
                <Link className="underline" href={`/quizzes/${onboardingQuiz.id}`}>{onboardingQuiz.title}</Link>
              ) : (
                <p className="text-sm text-neutral-600">No quiz linked yet.</p>
              )}
            </div>
          )}

          {tab === 'progress' && (
            <div className="max-w-md">
              <Progress value={percent} />
              <p className="text-sm text-neutral-600 mt-1">{percent}% complete</p>
            </div>
          )}
        </>
      ) : (
        <section className="grid gap-2 max-w-md">
          <h2 className="text-xl font-medium">Overall progress</h2>
          <Progress value={percent} />
          <p className="text-sm text-neutral-600">{percent}% complete</p>
          <div className="mt-2">
            <Link className="underline" href="/training?plan=onboarding">Open Onboarding plan</Link>
          </div>
        </section>
      )}
    </div>
  )
}
