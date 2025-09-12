import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import ProfileForm from "@/components/ProfileForm"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return (
      <div className="rounded-2xl border p-6 bg-white">
        <p className="text-sm">Please sign in to view your profile.</p>
      </div>
    )
  }
  const uid = (session.user as any).id
  let user: any = null
  // Try to read full profile fields from User first; fall back to minimal select
  try {
    user = await db.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        name: true,
        email: true,
        jobFunction: true,
        appKey: true,
        contentToken: true,
      },
    }) as any
  } catch {
    try {
      user = await db.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true } }) as any
    } catch {}
  }
  let kv: Record<string,string> = {}
  try {
    const rows: any[] = await (db as any).$queryRawUnsafe('SELECT key, value FROM "UserKV" WHERE "userId"=$1 AND key IN ($2,$3,$4,$5)', uid, 'appKey','contentToken','accessToken','jobFunction')
    kv = Object.fromEntries(rows.map((r:any)=>[r.key, r.value]))
  } catch {}
  const name = user?.name || (session.user as any)?.email || 'User'
  const safeUser = {
    name,
    email: user?.email || (session.user as any)?.email || '',
    jobFunction: (user as any)?.jobFunction ?? kv.jobFunction ?? '',
    appKey:      (user as any)?.appKey      ?? kv.appKey      ?? '',
    contentToken:(user as any)?.contentToken?? kv.contentToken?? '',
    accessToken: (user as any)?.accessToken ?? kv.accessToken ?? '',
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-neutral-600 mt-1">Manage your Icecat profile and tokens.</p>
        <ProfileForm user={safeUser} />
      </section>
    </div>
  )
}
export const dynamic = 'force-dynamic'
