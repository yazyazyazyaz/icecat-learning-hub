import AdminNav from "@/components/admin/AdminNav"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  const canAccess = role === 'ADMIN' || role === 'TRAINER'
  if (!canAccess) {
    // If not signed in, send to signin with callback; else to homepage
    if (!session?.user) redirect(`/signin?callbackUrl=/admin`)
    redirect('/')
  }
  return (
    <>
      <AdminNav />
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {children}
      </div>
    </>
  )
}
