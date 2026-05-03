'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SaasAppHeader from '@/components/SaasAppHeader'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug?: string
  business_type?: string
  created_at?: string
}

export default function BusinessesPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBusinesses = async () => {
      const authHeaders = await getAuthHeaders()

      if (!authHeaders) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/businesses', {
        cache: 'no-store',
        headers: authHeaders,
      })
      const data = await res.json()

      if (data.success) {
        setBusinesses(data.businesses || [])
        setError('')
      } else if (res.status === 401) {
        router.replace('/login')
        return
      } else {
        setError(data.message || 'Failed to load businesses')
      }

      setLoading(false)
    }

    fetchBusinesses()
  }, [router])

  return (
    <main style={page}>
      <SaasAppHeader title="Businesses" />

      <section style={toolbar}>
        <div>
          <h2 style={sectionTitle}>Your Businesses</h2>
          <p style={muted}>
            Choose a business to manage orders, menus and setup.
          </p>
        </div>

        <a href="/app/businesses/new" style={primaryButton}>
          Create New Business
        </a>
      </section>

      {loading && <p style={notice}>Loading businesses...</p>}
      {error && <p style={errorText}>{error}</p>}

      {!loading && businesses.length === 0 ? (
        <section style={emptyState}>
          <h2 style={{ marginTop: 0 }}>No businesses yet</h2>
          <p style={muted}>
            Create your first business to unlock the dashboard, menu manager and
            WhatsApp AI ordering setup.
          </p>
          <a href="/app/businesses/new" style={primaryButton}>
            Create New Business
          </a>
        </section>
      ) : (
        <section style={grid}>
          {businesses.map((business) => {
            const businessId = encodeURIComponent(business.id)

            return (
              <article key={business.id} style={card}>
                <div>
                  <p style={typeBadge}>
                    {business.business_type || 'business'}
                  </p>
                  <h2 style={businessName}>{business.name}</h2>
                  <p style={muted}>{business.slug || business.id}</p>
                </div>

                <div style={actions}>
                  <a
                    href={`/dashboard?business_id=${businessId}`}
                    style={primaryButton}
                  >
                    Dashboard
                  </a>
                  <a
                    href={`/menu?business_id=${businessId}`}
                    style={secondaryButton}
                  >
                    Menu
                  </a>
                  <a
                    href={`/menu-import?business_id=${businessId}`}
                    style={secondaryButton}
                  >
                    Import Menu
                  </a>
                  <a href="#" style={disabledButton}>
                    Settings
                  </a>
                </div>
              </article>
            )
          })}
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

const toolbar: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 20px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
}

const sectionTitle: React.CSSProperties = {
  margin: 0,
  color: '#020617',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0',
  lineHeight: 1.5,
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

const grid: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 16,
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
  display: 'grid',
  gap: 20,
}

const businessName: React.CSSProperties = {
  margin: '8px 0',
  color: '#020617',
}

const typeBadge: React.CSSProperties = {
  display: 'inline-block',
  background: '#e0f2fe',
  color: '#075985',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 900,
  margin: 0,
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
}

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#e0f2fe',
  color: '#075985',
}

const disabledButton: React.CSSProperties = {
  ...primaryButton,
  background: '#f1f5f9',
  color: '#64748b',
  cursor: 'not-allowed',
}

const emptyState: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  background: 'white',
  border: '1px dashed #cbd5e1',
  borderRadius: 22,
  padding: 28,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}
