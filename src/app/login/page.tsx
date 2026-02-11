'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      setError(result?.error || 'Invalid email or password.')
    } catch (submitError) {
      setError('Unable to sign in right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Regulatory Impact Engine
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
            Welcome back. Stay ahead of regulatory change.
          </h1>
          <p className="text-base text-slate-600">
            Sign in to monitor emerging rules, align teams, and quantify
            compliance impact with clarity.
          </p>
          <div className="rounded-2xl border border-white/60 bg-white/60 p-4 text-sm text-slate-600 shadow-sm backdrop-blur">
            This login experience uses secure, industry-standard authentication
            for your account.
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Use your work email and password to continue.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="email"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                />
              </div>

              {error ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              New here?{' '}
              <a
                className="font-semibold text-slate-700 underline-offset-4 transition hover:text-slate-900 hover:underline"
                href="/signup"
              >
                Create an account (to be created later)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
