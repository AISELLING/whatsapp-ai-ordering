'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlowCard, Tek9Logo } from '@/components/tek9'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type Business = {
  id: string
}

async function getPostLoginPath(accessToken: string) {
  const res = await fetch('/api/businesses', {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const data = await res.json()

  if (!data.success) {
    throw new Error(data.message || 'Failed to load businesses')
  }

  const businesses = (data.businesses || []) as Business[]

  if (businesses.length === 1) {
    return `/dashboard?business_id=${encodeURIComponent(businesses[0].id)}`
  }

  return '/onboarding'
}

export default function LoginPage() {
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

        if (session?.access_token) {
          router.replace(await getPostLoginPath(session.access_token))
          return
        }
      } catch (err: any) {
        setError(err.message || 'Unable to check login status')
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [router])

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(loginError.message)
        setLoading(false)
        return
      }

      if (!data.session?.access_token) {
        setError('Login succeeded, but no Supabase session was returned.')
        setLoading(false)
        return
      }

      router.push(await getPostLoginPath(data.session.access_token))
    } catch (err: any) {
      setError(err.message || 'Login failed')
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
              WhatsApp AI Ordering SaaS
            </span>
            <h1 className="mt-6 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Welcome back to tek9.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
              Manage businesses, menus, orders and AI-assisted WhatsApp
              workflows from one premium workspace.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-slate-300">
            {['Secure Auth', 'Live Orders', 'AI Upsells'].map((item) => (
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
          <form onSubmit={login} className="grid gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
                Login
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Sign in to tek9
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Enter your account details to continue.
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
              placeholder="Your password"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-2xl bg-gradient-to-r from-violet-400 to-cyan-300 px-5 py-4 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <p className="text-center text-sm text-slate-400">
              No account?{' '}
              <a href="/signup" className="font-black text-violet-200">
                Sign up
              </a>
            </p>
          </form>
        </GlowCard>
      </section>
    </main>
  )
}
