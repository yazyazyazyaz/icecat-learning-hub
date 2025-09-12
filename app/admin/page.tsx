import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Users, UserPlus, Settings, ArrowRight } from 'lucide-react'

export default async function AdminHome() {
  const session = await getServerSession(authOptions)
  const name = (session?.user as any)?.name || 'Admin'

  let totalUsers = 0, approvedUsers = 0, pendingUsers = 0, openInvites = 0
  try {
    const now = new Date()
    ;[totalUsers, approvedUsers, pendingUsers, openInvites] = await Promise.all([
      db.user.count().catch(()=>0),
      db.user.count({ where: { approved: true } }).catch(()=>0),
      db.user.count({ where: { approved: false } }).catch(()=>0),
      db.invite.count({ where: { usedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } as any }).catch(()=>0),
    ])
  } catch {}

  return (
    <div className="grid gap-6">
      {/* Hero */}
      <section className="rounded-2xl border border-[hsl(var(--border))] p-6 md:p-8" style={{ background: 'linear-gradient(180deg, hsla(var(--surface)), hsla(var(--surface))/0.9)' }}>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Welcome, {name}</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-prose">Manage people and access—minimal, fast, and to the point.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin/users" className="inline-flex items-center gap-2 rounded-2xl bg-[hsl(var(--fg))] text-white px-4 py-2 text-sm">
            <Users className="h-4 w-4" /> Open Users
          </Link>
          <Link href="/admin/users?status=pending" className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]/10">
            Pending approvals <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/editor" className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] px-4 py-2 text-sm hover:bg-[hsl(var(--accent))]/10">
            Editor Panel
          </Link>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
          <div className="text-xs text-neutral-600">Users</div>
          <div className="mt-1 text-2xl font-semibold">{totalUsers}</div>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
          <div className="text-xs text-neutral-600">Approved</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">{approvedUsers}</div>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
          <div className="text-xs text-neutral-600">Pending</div>
          <div className="mt-1 text-2xl font-semibold text-orange-600">{pendingUsers}</div>
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-white p-4">
          <div className="text-xs text-neutral-600">Open invites</div>
          <div className="mt-1 text-2xl font-semibold">{openInvites}</div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-white p-0 overflow-hidden">
        <ul className="divide-y divide-[hsl(var(--border))]">
          <li>
            <Link href="/admin/users" className="flex items-center gap-3 px-4 py-4 hover:bg-neutral-50">
              <Users className="h-4 w-4 text-neutral-600" />
              <div className="flex-1">
                <div className="font-medium">Manage users</div>
                <div className="text-xs text-neutral-600">Approve accounts, adjust roles</div>
              </div>
              <span aria-hidden className="text-neutral-400">›</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/users?status=pending" className="flex items-center gap-3 px-4 py-4 hover:bg-neutral-50">
              <UserPlus className="h-4 w-4 text-neutral-600" />
              <div className="flex-1">
                <div className="font-medium">Pending approvals</div>
                <div className="text-xs text-neutral-600">Review and activate new users</div>
              </div>
              <span aria-hidden className="text-neutral-400">›</span>
            </Link>
          </li>
          <li>
            <Link href="/editor" className="flex items-center gap-3 px-4 py-4 hover:bg-neutral-50">
              <Settings className="h-4 w-4 text-neutral-600" />
              <div className="flex-1">
                <div className="font-medium">Editor panel</div>
                <div className="text-xs text-neutral-600">Presentations, Documents, Manuals, Quizzes, Onboarding</div>
              </div>
              <span aria-hidden className="text-neutral-400">›</span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
