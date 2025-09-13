type Filter = { id: string; label: string }
export function Toolbar({ filters, onFilter }: { filters: Filter[]; onFilter: (id: string)=>void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      {filters.map(f => (
        <button
          key={f.id}
          onClick={() => onFilter(f.id)}
          className="px-3 py-1.5 rounded border border-[var(--muted)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
        >{f.label}</button>
      ))}
    </div>
  )
}

