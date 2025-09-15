export function primaryActionClasses() {
  const raw = (process.env.NEXT_PUBLIC_EDITOR_ACTION_THEME || 'blue').toString().toLowerCase()
  switch (raw) {
    case 'violet':
    case 'purple':
      return 'bg-violet-500 text-white hover:bg-violet-600 border-violet-600'
    case 'amber':
    case 'orange':
      return 'bg-amber-300 text-white hover:bg-amber-400 border-amber-400'
    case 'accent':
      return 'bg-[hsl(var(--accent))] text-white hover:brightness-110 border-[hsl(var(--accent))]'
    case 'blue':
    default:
      return 'bg-sky-500 text-white hover:bg-sky-600 border-sky-600'
  }
}

