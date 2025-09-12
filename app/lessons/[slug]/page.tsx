import { db } from '@/lib/db'
import { loadLessonMdxBySlug } from '@/lib/mdx'
import MarkDoneButton from '@/components/MarkDoneButton'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Props { params: { slug: string } }

export default async function LessonPage({ params }: Props) {
  const lesson = await db.lesson.findUnique({ where: { slug: params.slug } })
  if (!lesson) return <p>Lesson not found.</p>
  const mdx = !lesson.bodyMdx ? loadLessonMdxBySlug(lesson.slug) : { content: lesson.bodyMdx, frontmatter: {} }
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  let isCompleted = false
  if (userId) {
    const p = await db.progress.findUnique({ where: { userId_lessonId: { userId, lessonId: lesson.id } } })
    isCompleted = !!p?.isCompleted
  }
  return (
    <article className="prose prose-brand dark:prose-invert max-w-none">
      <header className="not-prose mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{lesson.title}</h1>
          <p className="text-sm text-gray-500">Slug: {lesson.slug}</p>
        </div>
        <MarkDoneButton lessonId={lesson.id} initialCompleted={isCompleted} />
      </header>
      {mdx?.content ? (
        <div className="mt-4 whitespace-pre-wrap">{mdx.content}</div>
      ) : (
        <p className="italic">No content available.</p>
      )}
    </article>
  )
}

