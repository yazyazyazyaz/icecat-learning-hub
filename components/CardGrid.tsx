export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

