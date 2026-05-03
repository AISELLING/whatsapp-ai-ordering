'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlowCard, Tek9Logo } from '@/components/tek9'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

function getErrorMessage(error: any, fallback: string) {
  if (!error) {
    return fallback
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  if (typeof error.error_description === 'string') {
    return error.error_description
  }

  if (typeof error.name === 'string') {
    return `${fallback}: ${error.name}`
  }

  return fallback
}

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          router.replace('/onboarding')
          return
        }
      } catch (err: any) {
        console.error('Supabase session check failed', err)
        setError(getErrorMessage(err, 'Unable to check login status'))
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  const signup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        console.error('Supabase signup returned an auth error', signupError)
        setError(getErrorMessage(signupError, 'Signup failed'))
        setLoading(false)
        return
      }

      router.push('/onboarding')
    } catch (err: any) {
      console.error('Supabase signup request failed', err)
      setError(getErrorMessage(err, 'Signup failed'))
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B0F1A] p-6 text-white">
        <GlowCard className="w-full max-w-md p-8 text-center">
          <Tek9Logo className="justify-center" />
          <h1 className="mt-8 text-2xl font-black">Checking session...</h1>
        </GlowCard>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0B0F1A] p-5 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,rgba(168,85,247,0.22),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.14),transparent_30%)]" />
      <section className="mx-auto grid min-h-[calc(100vh-40px)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1fr_440px]">
        <GlowCard className="hidden h-full min-h-[620px] flex-col justify-between p-10 lg:flex">
          <div>
            <Tek9Logo />
            <span className="mt-12 inline-flex rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm font-bold text-violet-100">
              Start your 14-day trial
            </span>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Launch WhatsApp ordering with tek9.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
              Create your account, add a business, import products and start
              turning conversations into managed orders.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
            {['No Coding', '5 Min Setup', 'AI Ready'].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 font-bold"
              >
                {item}
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard className="p-6 sm:p-8">
          <div className="mb-8 lg:hidden">
            <Tek9Logo />
          </div>
          <form onSubmit={signup} className="grid gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
                Signup
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Create your tek9 account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Use your email and password to get started.
              </p>
            </div>

            {error && (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
                {error}
              </p>
            )}

            <label className="text-sm font-bold text-slate-200">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50"
              placeholder="you@example.com"
            />

            <label className="text-sm font-bold text-slate-200">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50"
              placeholder="Choose a password"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-2xl bg-gradient-to-r from-violet-400 to-cyan-300 px-5 py-4 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <a href="/login" className="font-black text-violet-200">
                Login
              </a>
            </p>
          </form>
        </GlowCard>
      </section>
    </main>
  )
}
