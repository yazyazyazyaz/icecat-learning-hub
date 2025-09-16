export function isAttachmentPath(path?: string | null): boolean {
  if (!path) return false
  return path.startsWith('/uploads/') || path.startsWith('data:')
}

export function extractFileName(path?: string | null, fallback?: string): string | undefined {
  if (!path) return fallback
  const dataMatch = path.match(/;name=([^;]+);base64,/i)
  if (dataMatch && dataMatch[1]) {
    try {
      return decodeURIComponent(dataMatch[1])
    } catch {
      return dataMatch[1]
    }
  }
  const segments = path.split('/')
  const last = segments[segments.length - 1]
  return last || fallback
}

export function guessMimeFromData(path?: string | null): string | null {
  if (!path?.startsWith('data:')) return null
  const match = path.match(/^data:([^;,]+)[;,]/i)
  return match ? match[1] : null
}
