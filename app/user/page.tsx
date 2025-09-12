export default function UserHome() {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
        <h1 className="text-2xl font-semibold">User</h1>
        <p className="text-sm text-neutral-600 mt-1">Your account area for employees.</p>
        <ul className="mt-4 list-disc pl-6 text-sm text-neutral-700">
          <li>Browse Manuals, Documents, Presentations</li>
          <li>Take Quizzes and track progress</li>
        </ul>
      </section>
    </div>
  )
}

