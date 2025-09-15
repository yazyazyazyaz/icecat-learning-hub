export const runtime = 'nodejs'

export async function GET() {
  const body = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    HAS_DB_URL: Boolean(process.env.DATABASE_URL),
    HAS_DIRECT_URL: Boolean(process.env.DIRECT_URL),
  }
  return Response.json(body)
}

