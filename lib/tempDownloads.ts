const store = new Map<string, { buffer: Buffer; mime: string; filename: string; expires: number }>()

const DEFAULT_TTL_MS = 1000 * 60 * 10 // 10 minutes

export function saveTempDownload(buffer: Buffer, mime: string, filename: string, ttlMs = DEFAULT_TTL_MS): string {
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  store.set(token, { buffer, mime, filename, expires: Date.now() + ttlMs })
  return token
}

export function consumeTempDownload(token: string): { buffer: Buffer; mime: string; filename: string } | null {
  cleanupExpired()
  const entry = store.get(token)
  if (!entry) return null
  store.delete(token)
  return { buffer: entry.buffer, mime: entry.mime, filename: entry.filename }
}

function cleanupExpired() {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.expires <= now) {
      store.delete(key)
    }
  }
}
