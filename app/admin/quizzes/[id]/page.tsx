import { db } from '@/lib/db'
import { updateQuiz, addMcqQuestion, deleteQuestion } from '@/actions/admin'

export default async function EditQuizPage({ params }: { params: { id: string } }) {
  const quiz = await db.quiz.findUnique({ where: { id: params.id }, include: { questions: { orderBy: { order: 'asc' } } } })
  if (!quiz) {
    return <div className="p-4">Quiz not found.</div>
  }
  return (
    <div className="grid gap-6">
      <section className="soft-section">
        <h1 className="text-3xl md:text-4xl font-semibold heading-underline">{quiz.title}</h1>
        <p className="text-neutral-600 leading-7 max-w-prose mt-2">Edit settings and manage questions.</p>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Quiz settings</h2>
        <form action={async (fd: FormData) => { 'use server'; await updateQuiz(quiz.id, { title: String(fd.get('title')||quiz.title), description: String(fd.get('description')||''), passThreshold: Number(fd.get('passThreshold')||quiz.passThreshold), timeLimitSeconds: Number(fd.get('timeLimitSeconds')||quiz.timeLimitSeconds) }) }} className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input name="title" defaultValue={quiz.title} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Pass %</label>
            <input name="passThreshold" type="number" min={0} max={100} defaultValue={quiz.passThreshold} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Time (sec)</label>
            <input name="timeLimitSeconds" type="number" min={0} defaultValue={quiz.timeLimitSeconds} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Save</button>
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm mb-1">Description</label>
            <textarea name="description" rows={2} defaultValue={quiz.description || ''} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4">
        <h2 className="text-sm font-medium mb-3">Add multiple‑choice question</h2>
        <form action={async (fd: FormData) => { 'use server'; const prompt = String(fd.get('prompt')||''); const explanation = String(fd.get('explanation')||''); const options = [0,1,2,3].map(i => String(fd.get('opt'+i)||'' )).filter(x=>x); const correctIndex = Number(fd.get('correct')||0); const correct = options[correctIndex] || options[0]; await addMcqQuestion({ quizId: quiz.id, prompt, options, correct, explanation }); }} className="grid gap-3 md:grid-cols-5 items-end">
          <div className="md:col-span-5">
            <label className="block text-sm mb-1">Prompt</label>
            <input name="prompt" placeholder="Question text" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          {[0,1,2,3].map((i) => (
            <div key={i}>
              <label className="block text-sm mb-1">Option {i+1}</label>
              <input name={`opt${i}`} className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-sm mb-1">Correct</label>
            <select name="correct" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm">
              <option value={0}>Option 1</option>
              <option value={1}>Option 2</option>
              <option value={2}>Option 3</option>
              <option value={3}>Option 4</option>
            </select>
          </div>
          <div className="md:col-span-5">
            <label className="block text-sm mb-1">Explanation (optional)</label>
            <input name="explanation" className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Add question</button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-neutral-50/60">
            <tr>
              <th className="text-left py-2 px-3">#</th>
              <th className="text-left py-2 px-3">Prompt</th>
              <th className="text-left py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quiz.questions.map((q, idx) => (
              <tr key={q.id} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-2 px-3">{idx+1}</td>
                <td className="py-2 px-3">{q.prompt}</td>
                <td className="py-2 px-3">
                  <form action={async () => { 'use server'; await deleteQuestion(q.id) }}>
                    <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-2 py-1 hover:bg-neutral-100/60">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
