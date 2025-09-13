type Props = React.PropsWithChildren<{ title?: string; maxVH?: number }>;
export default function Bracket({ title, maxVH = 70, children }: Props) {
  return (
    <section aria-label={title ?? "Preview"} className="rounded-lg ring-1 ring-[var(--muted)] bg-[var(--card)]">
      {title && (
        <div className="px-3 py-2 text-xs text-slate-500 border-b border-[var(--muted)]">{title}</div>
      )}
      <div className="p-3 overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxVH}vh)` }}>
        {children}
      </div>
    </section>
  );
}

