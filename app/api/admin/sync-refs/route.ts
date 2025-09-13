import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncRefsFromFrostKitty } from '@/actions/refs'

export async function POST() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role as string | undefined
  if (!role || (role !== 'ADMIN' && role !== 'TRAINER')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const res = await syncRefsFromFrostKitty()
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}

