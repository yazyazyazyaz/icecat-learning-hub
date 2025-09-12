"use client"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 12 }}>{error?.message || 'Unknown error'}</p>
          <button onClick={() => reset()} style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid #ddd' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

