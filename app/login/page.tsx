'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
      <main style={page}>
        <section style={card}>
          <p style={eyebrow}>WhatsApp AI Ordering SaaS</p>
          <h1 style={title}>Checking session...</h1>
        </section>
      </main>
    )
  }

  return (
    <main style={page}>
      <section style={card}>
        <div style={brandPanel}>
          <p style={eyebrow}>WhatsApp AI Ordering SaaS</p>
          <h1 style={title}>Welcome back</h1>
          <p style={subtitle}>
            Sign in to manage your businesses, menus, orders and WhatsApp AI
            ordering workflows.
          </p>
        </div>

        <form onSubmit={login} style={form}>
          <div>
            <h2 style={formTitle}>Login</h2>
            <p style={muted}>Enter your account details to continue.</p>
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <label style={label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={input}
            placeholder="you@example.com"
          />

          <label style={label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={input}
            placeholder="Your password"
          />

          <button type="submit" disabled={loading} style={button}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p style={footerText}>
            No account? <a href="/signup" style={link}>Sign up</a>
          </p>
        </form>
      </section>
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 960,
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 24,
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)',
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 420px)',
  overflow: 'hidden',
}

const brandPanel: React.CSSProperties = {
  background: 'linear-gradient(135deg, #020617, #1e293b)',
  color: 'white',
  padding: 40,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

const eyebrow: React.CSSProperties = {
  color: '#38bdf8',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 800,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  margin: '10px 0',
  fontSize: 42,
  lineHeight: 1.05,
}

const subtitle: React.CSSProperties = {
  margin: 0,
  color: '#cbd5e1',
  lineHeight: 1.6,
  maxWidth: 440,
}

const form: React.CSSProperties = {
  padding: 40,
  display: 'grid',
  gap: 12,
  alignContent: 'center',
}

const formTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  color: '#020617',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '6px 0 8px',
  lineHeight: 1.5,
}

const label: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 13,
  color: '#0f172a',
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 13,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  fontSize: 15,
  boxSizing: 'border-box',
  outlineColor: '#38bdf8',
}

const button: React.CSSProperties = {
  marginTop: 8,
  padding: 14,
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 900,
  fontSize: 15,
}

const errorStyle: React.CSSProperties = {
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
  margin: 0,
}

const footerText: React.CSSProperties = {
  color: '#64748b',
  margin: '8px 0 0',
}

const link: React.CSSProperties = {
  color: '#075985',
  fontWeight: 900,
  textDecoration: 'none',
}
