'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type OrderItem = {
  name?: string
  quantity?: number
  unit_price?: number
  line_total?: number
  notes?: string
}

type Order = {
  id: string
  customer_profile_name?: string
  customer_phone?: string
  items?: OrderItem[]
  subtotal?: number | string
  payment_status?: string
  order_status?: string
  order_type?: string
  created_at?: string
}

const statuses = ['new', 'accepted', 'preparing', 'ready', 'completed', 'rejected']

export default function OrdersPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

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

  useEffect(() => {
    loadOrders()
  }, [businessId])

  const updateStatus = async (orderId: string, orderStatus: string) => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setUpdatingId(orderId)
    setError('')

    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        business_id: businessId,
        order_id: orderId,
        order_status: orderStatus,
      }),
    })
    const data = await res.json()

    setUpdatingId('')

    if (data.success) {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, order_status: orderStatus } : order
        )
      )
      return
    }

    if (res.status === 401) {
      router.replace('/login')
      return
    }

    if (res.status === 403) {
      router.replace('/app/businesses')
      return
    }

    setError(data.message || 'Failed to update order status')
  }

  return (
    <>
      <section style={toolbar}>
        <div>
          <h1 style={pageTitle}>Orders</h1>
          <p style={muted}>Review and manage orders for this business.</p>
        </div>
      </section>

      {loading && <p style={notice}>Loading orders...</p>}
      {error && <p style={errorText}>{error}</p>}

      {!loading && orders.length === 0 ? (
        <section style={emptyState}>
          <h2 style={{ marginTop: 0 }}>No orders yet</h2>
          <p style={muted}>
            Orders will appear here once customers start ordering.
          </p>
        </section>
      ) : (
        <section style={orderList}>
          {orders.map((order) => (
            <article key={order.id} style={orderCard}>
              <div style={orderHeader}>
                <div>
                  <p style={eyebrow}>Order {order.id.slice(0, 8)}</p>
                  <h2 style={customerName}>
                    {order.customer_profile_name ||
                      order.customer_phone ||
                      'Customer'}
                  </h2>
                  <p style={muted}>
                    {order.customer_phone || 'No phone'} ·{' '}
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <div style={totals}>
                  <span style={paymentBadge}>
                    {order.payment_status || 'pending'}
                  </span>
                  <strong>£{Number(order.subtotal || 0).toFixed(2)}</strong>
                </div>
              </div>

              <div style={itemsList}>
                {(order.items || []).length === 0 ? (
                  <p style={muted}>No items recorded.</p>
                ) : (
                  (order.items || []).map((item, index) => (
                    <div key={`${order.id}-${index}`} style={itemRow}>
                      <span>
                        {Number(item.quantity || 1)} x {item.name || 'Item'}
                        {item.notes ? ` (${item.notes})` : ''}
                      </span>
                      <strong>
                        £{Number(item.line_total || item.unit_price || 0).toFixed(2)}
                      </strong>
                    </div>
                  ))
                )}
              </div>

              <div style={statusArea}>
                <div>
                  <p style={label}>Order status</p>
                  <strong>{order.order_status || 'new'}</strong>
                </div>

                <div style={statusButtons}>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(order.id, status)}
                      disabled={updatingId === order.id}
                      style={{
                        ...statusButton,
                        ...(order.order_status === status ? activeStatusButton : {}),
                      }}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}

function statusLabel(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value?: string) {
  if (!value) return 'Unknown date'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const toolbar: React.CSSProperties = {
  marginBottom: 20,
}

const pageTitle: React.CSSProperties = {
  color: '#020617',
  margin: 0,
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0',
  lineHeight: 1.5,
}

const notice: React.CSSProperties = {
  color: '#64748b',
}

const errorText: React.CSSProperties = {
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
}

const emptyState: React.CSSProperties = {
  background: 'white',
  border: '1px dashed #cbd5e1',
  borderRadius: 22,
  padding: 24,
}

const orderList: React.CSSProperties = {
  display: 'grid',
  gap: 16,
}

const orderCard: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const orderHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  marginBottom: 16,
}

const eyebrow: React.CSSProperties = {
  color: '#075985',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 900,
  fontSize: 12,
  margin: 0,
}

const customerName: React.CSSProperties = {
  color: '#020617',
  margin: '6px 0',
}

const totals: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
}

const paymentBadge: React.CSSProperties = {
  background: '#e0f2fe',
  color: '#075985',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 900,
}

const itemsList: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  padding: '14px 0',
}

const itemRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
}

const statusArea: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
  marginTop: 16,
}

const label: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 800,
  margin: 0,
}

const statusButtons: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

const statusButton: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: 'white',
  color: '#0f172a',
  cursor: 'pointer',
  fontWeight: 800,
}

const activeStatusButton: React.CSSProperties = {
  background: '#020617',
  borderColor: '#020617',
  color: 'white',
}
