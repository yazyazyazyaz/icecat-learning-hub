// Feature flags with safe defaults for production if envs are missing.
function truthy(v: string | undefined | null): boolean {
  if (!v) return false
  const s = String(v).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on'
}

// Default onboarding to true unless explicitly disabled.
const rawOnboarding = process.env.NEXT_PUBLIC_FEATURE_ONBOARDING ?? process.env.FEATURE_ONBOARDING
export const flags = {
  onboarding: rawOnboarding == null ? true : truthy(rawOnboarding),
}
