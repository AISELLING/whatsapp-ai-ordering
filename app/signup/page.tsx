'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

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
          router.replace('/dashboard')
          return
        }
      } catch (err: any) {
        setError(err.message || 'Unable to check login status')
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
        setError(signupError.message)
        setLoading(false)
        return
      }

      router.push('/onboarding')
    } catch (err: any) {
      setError(err.message || 'Signup failed')
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
          <h1 style={title}>Create your account</h1>
          <p style={subtitle}>
            Launch a secure workspace for onboarding businesses, importing
            menus and managing AI-assisted orders.
          </p>
        </div>

        <form onSubmit={signup} style={form}>
          <div>
            <h2 style={formTitle}>Sign Up</h2>
            <p style={muted}>Use your email and password to get started.</p>
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
            placeholder="Choose a password"
          />

          <button type="submit" disabled={loading} style={button}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>

          <p style={footerText}>
            Already have an account? <a href="/login" style={link}>Login</a>
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
