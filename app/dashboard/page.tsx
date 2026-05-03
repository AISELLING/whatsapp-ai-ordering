'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthHeaders, getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug?: string
  business_type?: string
}

type Order = {
  id: string
  payment_status?: string
  subtotal?: number | string
  order_type?: string
  order_status?: string
  customer_phone?: string
  created_at?: string
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const businessId = params.get('business_id')

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const businessPath = businessId ? `?business_id=${encodeURIComponent(businessId)}` : ''

  const loadBusinesses = async (authHeaders: { Authorization: string }) => {
    const res = await fetch('/api/businesses', {
      cache: 'no-store',
      headers: authHeaders,
    })
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.message || 'Failed to load businesses')
    }

    return (data.businesses || []) as Business[]
  }

  const logout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    try {
      const userBusinesses = await loadBusinesses(authHeaders)
      setBusinesses(userBusinesses)

      if (!businessId) {
        if (userBusinesses.length === 1) {
          router.replace(
            `/dashboard?business_id=${encodeURIComponent(userBusinesses[0].id)}`
          )
          return
        }

        router.replace('/onboarding')
        return
      }

      const matchedBusiness =
        userBusinesses.find((business) => business.id === businessId) || null

      if (!matchedBusiness) {
        router.replace('/onboarding')
        return
      }

      setCurrentBusiness(matchedBusiness)

      const ordersRes = await fetch(`/api/orders?business_id=${businessId}`, {
        cache: 'no-store',
        headers: authHeaders,
      })
      const ordersData = await ordersRes.json()

      if (ordersData.success) {
        setOrders(ordersData.orders || [])
      } else if (ordersRes.status === 401) {
        router.replace('/login')
        return
      } else if (ordersRes.status === 403) {
        router.replace('/onboarding')
        return
      } else {
        setError(ordersData.message || 'Failed to load orders')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [businessId])

  const revenue = orders
    .filter((order) => order.payment_status === 'paid')
    .reduce((sum, order) => sum + Number(order.subtotal || 0), 0)

  return (
    <main style={page}>
      <header style={header}>
        <div>
          <p style={eyebrow}>WhatsApp AI Ordering SaaS</p>
          <h1 style={title}>{currentBusiness?.name || 'Dashboard'}</h1>
        </div>

        <nav style={nav}>
          <a href="/onboarding" style={navLink}>Businesses</a>
          <a href={`/menu${businessPath}`} style={navLink}>Menu</a>
          <a href={`/menu-import${businessPath}`} style={navLink}>Menu Import</a>
          <button onClick={logout} style={logoutButton}>Logout</button>
        </nav>
      </header>

      <section style={toolbar}>
        <div>
          <h2 style={sectionTitle}>Overview</h2>
          <p style={muted}>
            {currentBusiness
              ? `Live order performance for ${currentBusiness.name}.`
              : 'Loading your business dashboard.'}
          </p>
        </div>

        <div style={actions}>
          <a href={`/menu${businessPath}`} style={secondaryButton}>Manage Menu</a>
          <a href={`/menu-import${businessPath}`} style={secondaryButton}>Import Menu</a>
          <a href="/onboarding" style={primaryButton}>Back to Businesses</a>
        </div>
      </section>

      {loading && <p style={notice}>Loading dashboard...</p>}
      {error && <p style={errorText}>{error}</p>}

      <section style={statsGrid}>
        <div style={card}>
          <p style={statLabel}>Revenue</p>
          <strong style={statValue}>£{revenue.toFixed(2)}</strong>
          <span style={statHint}>Paid orders only</span>
        </div>

        <div style={card}>
          <p style={statLabel}>Orders</p>
          <strong style={statValue}>{orders.length}</strong>
          <span style={statHint}>Total orders loaded</span>
        </div>

        <div style={card}>
          <p style={statLabel}>Business ID</p>
          <strong style={businessIdText}>{businessId || 'Resolving...'}</strong>
          <span style={statHint}>{currentBusiness?.business_type || 'Business'}</span>
        </div>
      </section>

      <section style={ordersSection}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Recent Orders</h2>
            <p style={muted}>Paid, pending and new orders for this business.</p>
          </div>
        </div>

        {!loading && orders.length === 0 ? (
          <div style={emptyState}>
            <h3 style={{ marginTop: 0 }}>No orders yet</h3>
            <p style={muted}>
              Orders will appear here once customers start placing them through
              your WhatsApp AI ordering flow.
            </p>
            <a href={`/menu-import${businessPath}`} style={primaryButton}>
              Import Menu
            </a>
          </div>
        ) : (
          <div style={orderList}>
            {orders.map((order) => (
              <article key={order.id} style={orderCard}>
                <div>
                  <strong>Order {order.id.slice(0, 8)}</strong>
                  <p style={muted}>
                    {order.customer_phone || 'Customer'} · {order.order_type || 'Type pending'}
                  </p>
                </div>

                <div style={orderMeta}>
                  <span style={statusBadge}>{order.payment_status || 'pending'}</span>
                  <strong>£{Number(order.subtotal || 0).toFixed(2)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {businesses.length > 1 && (
        <section style={ordersSection}>
          <h2 style={sectionTitle}>Switch Business</h2>
          <div style={switcher}>
            {businesses.map((business) => (
              <a
                key={business.id}
                href={`/dashboard?business_id=${business.id}`}
                style={{
                  ...businessSwitch,
                  borderColor: business.id === businessId ? '#38bdf8' : '#e2e8f0',
                }}
              >
                <strong>{business.name}</strong>
                <span style={muted}>{business.slug || business.id}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<p style={{ padding: 30 }}>Loading...</p>}>
      <DashboardContent />
    </Suspense>
  )
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
  fontWeight: 800,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 36,
}

const nav: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

const navLink: React.CSSProperties = {
  color: '#e0f2fe',
  textDecoration: 'none',
  fontWeight: 800,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
}

const logoutButton: React.CSSProperties = {
  ...navLink,
  background: 'white',
  color: '#020617',
  cursor: 'pointer',
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

const actions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
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
  fontSize: 34,
  margin: '8px 0',
}

const businessIdText: React.CSSProperties = {
  display: 'block',
  color: '#020617',
  fontSize: 16,
  margin: '14px 0',
  overflowWrap: 'anywhere',
}

const statHint: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
}

const ordersSection: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 20px',
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginBottom: 16,
}

const emptyState: React.CSSProperties = {
  border: '1px dashed #cbd5e1',
  borderRadius: 18,
  padding: 24,
  background: '#f8fafc',
}

const orderList: React.CSSProperties = {
  display: 'grid',
  gap: 12,
}

const orderCard: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
}

const orderMeta: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const statusBadge: React.CSSProperties = {
  background: '#e0f2fe',
  color: '#075985',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 900,
}

const switcher: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  marginTop: 16,
}

const businessSwitch: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 16,
  padding: 16,
  display: 'grid',
  gap: 4,
  color: '#020617',
  textDecoration: 'none',
}
