'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type OrderItem = {
  name?: string
  quantity?: number
  line_total?: number
  unit_price?: number
}

type Order = {
  id: string
  customer_profile_name?: string
  customer_phone?: string
  items?: OrderItem[]
  payment_status?: string
  subtotal?: number | string
  order_type?: string
  order_status?: string
  created_at?: string
}

export default function BusinessDashboardPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true)
      setError('')

      const authHeaders = await getAuthHeaders()

      if (!authHeaders) {
        router.replace('/login')
        return
      }

      const res = await fetch(`/api/orders?business_id=${businessId}`, {
        cache: 'no-store',
        headers: authHeaders,
      })
      const data = await res.json()

      if (data.success) {
        setOrders(data.orders || [])
      } else if (res.status === 401) {
        router.replace('/login')
        return
      } else if (res.status === 403) {
        router.replace('/app/businesses')
        return
      } else {
        setError(data.message || 'Failed to load orders')
      }

      setLoading(false)
    }

    loadOrders()
  }, [businessId, router])

  const revenue = orders
    .filter((order) => order.payment_status === 'paid')
    .reduce((sum, order) => sum + Number(order.subtotal || 0), 0)

  const encodedBusinessId = encodeURIComponent(businessId)
  const recentOrders = orders.slice(0, 5)

  return (
    <>
      <section style={toolbar}>
        <div>
          <h1 style={pageTitle}>Dashboard</h1>
          <p style={muted}>Live order performance for this business.</p>
        </div>

        <div style={actions}>
          <a
            href={`/app/businesses/${encodedBusinessId}/orders`}
            style={primaryButton}
          >
            View All Orders
          </a>
          <a href={`/menu?business_id=${encodedBusinessId}`} style={secondaryButton}>
            Manage Menu
          </a>
          <a
            href={`/menu-import?business_id=${encodedBusinessId}`}
            style={secondaryButton}
          >
            Import Menu
          </a>
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
          <strong style={businessIdText}>{businessId}</strong>
          <span style={statHint}>Workspace identifier</span>
        </div>
      </section>

      <section id="orders" style={ordersSection}>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Recent Orders</h2>
            <p style={muted}>The latest orders for this business.</p>
          </div>

          <a
            href={`/app/businesses/${encodedBusinessId}/orders`}
            style={secondaryButton}
          >
            Full Orders Page
          </a>
        </div>

        {!loading && recentOrders.length === 0 ? (
          <div style={emptyState}>
            <h3 style={{ marginTop: 0 }}>No orders yet</h3>
            <p style={muted}>
              Orders will appear here once customers start placing them through
              your WhatsApp AI ordering flow.
            </p>
            <a
              href={`/menu-import?business_id=${encodedBusinessId}`}
              style={primaryButton}
            >
              Import Menu
            </a>
          </div>
        ) : (
          <div style={orderList}>
            {recentOrders.map((order) => (
              <article key={order.id} style={orderCard}>
                <div>
                  <strong>
                    {order.customer_profile_name ||
                      order.customer_phone ||
                      `Order ${order.id.slice(0, 8)}`}
                  </strong>
                  <p style={muted}>
                    {formatItems(order.items)} · {order.order_status || 'new'}
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
    </>
  )
}

function formatItems(items?: OrderItem[]) {
  if (!items || items.length === 0) return 'No items'

  return items
    .slice(0, 2)
    .map((item) => `${Number(item.quantity || 1)} x ${item.name || 'Item'}`)
    .join(', ')
}

const toolbar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginBottom: 20,
}

const pageTitle: React.CSSProperties = {
  margin: 0,
  color: '#020617',
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
  color: '#64748b',
  marginBottom: 16,
}

const errorText: React.CSSProperties = {
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
}

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  marginBottom: 20,
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
