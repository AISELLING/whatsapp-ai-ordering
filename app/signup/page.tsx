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
    return <main style={page}>Checking session...</main>
  }

  return (
    <main style={page}>
      <form onSubmit={signup} style={form}>
        <h1>Sign Up</h1>

        {error && <p style={errorStyle}>{error}</p>}

        <label style={label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          style={input}
        />

        <label style={label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          style={input}
        />

        <button type="submit" disabled={loading} style={button}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>

        <p>
          Already have an account? <a href="/login">Login</a>
        </p>
      </form>
    </main>
  )
}

const page: React.CSSProperties = {
  padding: 40,
  fontFamily: 'Arial',
}

const form: React.CSSProperties = {
  maxWidth: 420,
  display: 'grid',
  gap: 12,
}

const label: React.CSSProperties = {
  fontWeight: 700,
}

const input: React.CSSProperties = {
  padding: 10,
  fontSize: 16,
}

const button: React.CSSProperties = {
  padding: '12px 20px',
  background: 'black',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  color: 'red',
}
