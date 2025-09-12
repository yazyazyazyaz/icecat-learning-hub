import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import InviteForm from "@/components/admin/InviteForm"
import { SubmitButton, SaveStatus } from "@/components/FormSaveControls"

export default async function AdminUsersPage({ searchParams }: { searchParams?: { status?: string } }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (role !== 'ADMIN') {
    return (
      <div className="grid gap-6">
        <div className="soft-section">
          <h1 className="text-3xl md:text-4xl font-semibold heading-underline">Users</h1>
          <p className="text-neutral-600 mt-2 text-sm">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }
  const status = searchParams?.status === 'approved' ? 'approved' : searchParams?.status === 'pending' ? 'pending' : 'all'
  const where = status === 'approved' ? { approved: true } : status === 'pending' ? { approved: false } : {}
  let users: any[] = []
  try {
    users = await db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
      },
    }) as any
  } catch (e) {
    console.error('AdminUsersPage: DB unavailable', e)
    users = []
  }
  // Teams de-scoped for now
  return (
    <div className="grid gap-6">
      <div className="soft-section">
        <h1 className="text-3xl md:text-4xl font-semibold heading-underline">Users</h1>
      </div>
      <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-4 shadow-sm">
        <h2 className="text-sm font-medium mb-3">Invite an employee</h2>
        <InviteForm />
      </section>
      <div className="flex items-center gap-3 px-1">
        <a className={`px-3 py-1 rounded-full text-sm ${status==='all'?'bg-neutral-100':''}`} href="/admin/users">All</a>
        <a className={`px-3 py-1 rounded-full text-sm ${status==='pending'?'bg-neutral-100':''}`} href="/admin/users?status=pending">Pending</a>
        <a className={`px-3 py-1 rounded-full text-sm ${status==='approved'?'bg-neutral-100':''}`} href="/admin/users?status=approved">Approved</a>
      </div>
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-[hsl(var(--border))] bg-neutral-50/60">
            <tr>
              <th className="text-left py-2 px-3 w-10"><input type="checkbox" aria-label="Select all" /></th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Email</th>
              <th className="text-left py-2 px-3">Function</th>
              <th className="text-left py-2 px-3">Role</th>
              <th className="text-left py-2 px-3">Approved</th>
              
              <th className="text-left py-2 px-3">Deactivate</th>
              <th className="text-left py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-[hsl(var(--border))] last:border-0">
                <td className="py-2 px-3"><input type="checkbox" name="userId" value={u.id} aria-label={`Select ${u.email}`} /></td>
                <td className="py-2 px-3">{u.name ?? "—"}</td>
                <td className="py-2 px-3">
                  <form action={async (fd: FormData)=>{ 'use server'; const { updateUserEmail } = await import('@/actions/users'); await updateUserEmail(fd) }} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <input name="email" defaultValue={u.email} className="rounded-xl border px-2 py-1 text-sm bg-white" />
                    <SubmitButton label="Save" pendingLabel="Saving..." className="text-xs px-2 py-1" />
                    <SaveStatus />
                  </form>
                </td>
                <td className="py-2 px-3">{u.jobFunction ?? '-'}</td>
                <td className="py-2 px-3">
                  <form action={async (fd: FormData) => { 'use server'; const { updateUserRole } = await import('@/actions/users'); await updateUserRole(fd) }} className="flex items-center gap-2">
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="role" defaultValue={u.role} className="rounded-xl border px-2 py-1 text-sm bg-white">
                      <option value="ADMIN">Admin</option>
                      <option value="TRAINER">Editor</option>
                      <option value="EMPLOYEE">Employee</option>
                    </select>
                    <SubmitButton label="Update" pendingLabel="Updating..." className="text-xs px-2 py-1" />
                  </form>
                </td>
                <td className="py-2 px-3">
                  {u.approved ? (
                    <span className="px-2 py-1 rounded-full border border-green-200 bg-green-100 text-green-800 text-xs">Approved</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full border border-neutral-200 bg-neutral-100 text-neutral-700 text-xs">Pending</span>
                  )}
                </td>
                
                <td className="py-2 px-3">
                  {u.approved ? (
                    <button
                      formAction={async () => { 'use server'; const { deactivateUser } = await import('@/actions/users'); await deactivateUser(u.id) }}
                      className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-2 py-1 hover:bg-neutral-100/60"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
                <td className="py-2 px-3">
                  {!u.approved ? (
                    <button
                      formAction={async () => { 'use server'; const { approveUser } = await import('@/actions/users'); await approveUser(u.id) }}
                      className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-1 hover:bg-neutral-100/60"
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-neutral-500">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
      </div>
    </div>
  )
}

