"use client"
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

function SignInInner() {
  const sp = useSearchParams()
  const callbackUrl = sp.get('callbackUrl') ?? '/dashboard'
  const error = sp.get('error') || ''
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values: FormData) {
    await signIn('credentials', { ...values, callbackUrl })
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-6 shadow-sm text-[15px]">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        {error === 'AccountNotApproved' && (
          <div className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-2">
            Account needs to get approved first.
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input className="input" type="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input className="input" type="password" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <button disabled={isSubmitting} className="inline-flex items-center justify-center rounded-2xl bg-[hsl(var(--fg))] text-white px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
        <div className="text-xs text-neutral-600">
          <p className="mb-1">No account? <a className="underline" href="/register">Register</a> (requires admin approval)</p>
          <p>Demo users: admin@, trainer@, employee@, viewer@ with password password123</p>
        </div>
      </form>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  )
}
