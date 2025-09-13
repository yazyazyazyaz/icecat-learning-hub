type Props = {
  title: string;
  description?: string;
  tags?: string[];
  href: string;
  kind?: "manual" | "presentation";
};
export default function ManualCard({ title, description, tags = [], href, kind = "manual" }: Props) {
  const badge = kind === "presentation" ? "Presentation" : "Manual";
  return (
    <a href={href} className="group block rounded-lg bg-[var(--card)] ring-1 ring-[var(--muted)] hover:ring-[var(--accent)] transition-shadow p-4 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
      <div className="flex items-start justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-slate-700 dark:text-slate-200">{badge}</span>
      </div>
      <h3 className="mt-3 text-base font-medium text-[var(--fg)] group-hover:underline">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-600 line-clamp-3">{description}</p>}
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {tags.map(t => <li key={t} className="text-[11px] px-2 py-0.5 bg-[var(--surface)] rounded border border-[var(--muted)]">{t}</li>)}
        </ul>
      )}
    </a>
  );
}

