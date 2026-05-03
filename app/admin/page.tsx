'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthHeaders, getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type AdminOverview = {
  totals: {
    users: number
    businesses: number
    orders: number
  }
  latestUsers: Array<{
    id: string
    email: string
    created_at?: string
  }>
  latestBusinesses: Array<{
    id: string
    name: string
    slug?: string
    business_type?: string
    created_at?: string
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOverview = async () => {
      const authHeaders = await getAuthHeaders()

      if (!authHeaders) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/admin/overview', {
        cache: 'no-store',
        headers: authHeaders,
      })
      const data = await res.json()

      if (data.success) {
        setOverview(data)
        setError('')
      } else if (res.status === 401) {
        router.replace('/login')
        return
      } else {
        setError(data.message || 'Failed to load admin dashboard')
      }

      setLoading(false)
    }

    loadOverview()
  }, [router])

  const logout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <main style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>WhatsApp AI Ordering SaaS</p>
          <h1 style={title}>Admin Dashboard</h1>
        </div>
        <nav style={headerActions}>
          <a href="/app/businesses" style={headerLink}>Back to App</a>
          <button onClick={logout} style={logoutButton}>Logout</button>
        </nav>
      </header>

      {loading && <p style={notice}>Loading admin dashboard...</p>}
      {error && <p style={errorText}>{error}</p>}

      {overview && (
        <>
          <section style={statsGrid}>
            <div style={card}>
              <p style={statLabel}>Total Users</p>
              <strong style={statValue}>{overview.totals.users}</strong>
            </div>
            <div style={card}>
              <p style={statLabel}>Total Businesses</p>
              <strong style={statValue}>{overview.totals.businesses}</strong>
            </div>
            <div style={card}>
              <p style={statLabel}>Total Orders</p>
              <strong style={statValue}>{overview.totals.orders}</strong>
            </div>
          </section>

          <section style={grid}>
            <div style={panel}>
              <h2 style={panelTitle}>Latest Users</h2>

              {overview.latestUsers.length === 0 ? (
                <p style={muted}>No users yet.</p>
              ) : (
                <div style={list}>
                  {overview.latestUsers.map((user) => (
                    <div key={user.id} style={row}>
                      <div>
                        <strong>{user.email || 'No email'}</strong>
                        <p style={muted}>{user.id}</p>
                      </div>
                      <span style={dateText}>{formatDate(user.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panel}>
              <h2 style={panelTitle}>Latest Businesses</h2>

              {overview.latestBusinesses.length === 0 ? (
                <p style={muted}>No businesses yet.</p>
              ) : (
                <div style={list}>
                  {overview.latestBusinesses.map((business) => (
                    <div key={business.id} style={row}>
                      <div>
                        <strong>{business.name}</strong>
                        <p style={muted}>
                          {business.slug || business.id} ·{' '}
                          {business.business_type || 'business'}
                        </p>
                      </div>
                      <span style={dateText}>
                        {formatDate(business.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function formatDate(value?: string) {
  if (!value) return 'Unknown'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 32,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const header: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 24px',
  background: 'linear-gradient(135deg, #020617, #1e293b)',
  color: 'white',
  borderRadius: 24,
  padding: 28,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'center',
}

const eyebrow: React.CSSProperties = {
  color: '#38bdf8',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 900,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 36,
}

const headerActions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

const headerLink: React.CSSProperties = {
  color: '#020617',
  background: 'white',
  textDecoration: 'none',
  fontWeight: 900,
  padding: '11px 14px',
  borderRadius: 12,
}

const logoutButton: React.CSSProperties = {
  ...headerLink,
  border: 'none',
  cursor: 'pointer',
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

const statsGrid: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 20px',
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 20,
  padding: 20,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const statLabel: React.CSSProperties = {
  color: '#64748b',
  margin: 0,
  fontWeight: 800,
  fontSize: 13,
}

const statValue: React.CSSProperties = {
  display: 'block',
  color: '#020617',
  fontSize: 36,
  marginTop: 8,
}

const grid: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 16,
}

const panel: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const panelTitle: React.CSSProperties = {
  marginTop: 0,
  color: '#020617',
}

const list: React.CSSProperties = {
  display: 'grid',
  gap: 12,
}

const row: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 14,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  alignItems: 'center',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0 0',
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
}

const dateText: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  whiteSpace: 'nowrap',
}
