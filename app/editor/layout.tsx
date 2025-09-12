import EditorNav from "@/components/editor/EditorNav"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  const canAccess = role === 'ADMIN' || role === 'TRAINER'
  if (!canAccess) {
    if (!session?.user) redirect(`/signin?callbackUrl=/editor`)
    redirect('/')
  }
  return (
    <>
      <EditorNav />
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        {children}
      </div>
    </>
  )
}

