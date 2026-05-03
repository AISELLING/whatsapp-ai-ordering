'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SaasAppHeader from '@/components/SaasAppHeader'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

export default function AccountPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/login')
          return
        }

        setEmail(session.user.email || '')
      } catch (err: any) {
        setError(err.message || 'Failed to load account')
      }

      setLoading(false)
    }

    loadAccount()
  }, [router])

  const logout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main style={page}>
      <SaasAppHeader title="Account" />

      {loading && <p style={notice}>Loading account...</p>}
      {error && <p style={errorText}>{error}</p>}

      {!loading && !error && (
        <section style={card}>
          <h2 style={cardTitle}>Your Account</h2>
          <p style={muted}>Signed in as</p>
          <strong style={emailText}>{email || 'No email available'}</strong>

          <div style={actions}>
            <a href="/app/businesses" style={secondaryButton}>
              Back to Businesses
            </a>
            <button onClick={logout} style={primaryButton}>
              Logout
            </button>
          </div>
        </section>
      )}
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 32,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const notice: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 16px',
  color: '#64748b',
}

const errorText: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 16px',
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
}

const card: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const cardTitle: React.CSSProperties = {
  marginTop: 0,
  color: '#020617',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0',
  lineHeight: 1.5,
}

const emailText: React.CSSProperties = {
  display: 'block',
  color: '#020617',
  fontSize: 22,
  margin: '8px 0 24px',
}

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
}

const primaryButton: React.CSSProperties = {
  display: 'inline-block',
  padding: '11px 14px',
  background: '#020617',
  color: 'white',
  textDecoration: 'none',
  borderRadius: 12,
  fontWeight: 900,
  border: 'none',
  cursor: 'pointer',
}

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#e0f2fe',
  color: '#075985',
}
