import WizardClient from "@/components/WizardClient"

export default async function WizardPage() {
  return (
    <div className="grid gap-6 w-full max-w-full overflow-x-hidden">
      <section className="min-w-0 w-full max-w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Wizard</h1>
        <p className="text-sm text-neutral-600 mt-1">Fetch JSON/XML from Icecat for single or batch products.</p>
        <WizardClient />
      </section>
    </div>
  )
}
