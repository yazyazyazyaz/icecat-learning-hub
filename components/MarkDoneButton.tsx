"use client"
import { useTransition } from 'react'
import { markLessonDone } from '@/actions/progress'

export default function MarkDoneButton({ lessonId, initialCompleted }: { lessonId: string, initialCompleted: boolean }) {
  const [isPending, start] = useTransition()
  const nextVal = !initialCompleted
  return (
    <form action={(formData) => start(async () => { await markLessonDone(formData) })}>
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="isCompleted" value={String(nextVal)} />
      <button disabled={isPending} className={`px-3 py-1 ${initialCompleted ? 'btn-success' : 'btn-outline'}`}>
        {isPending ? 'Saving.' : initialCompleted ? 'Completed' : 'Mark as done'}
      </button>
    </form>
  )
}

