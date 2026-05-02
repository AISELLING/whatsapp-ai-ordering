'use client'

import { useEffect, useMemo, useState } from 'react'

type OrderItem = {
  name?: string
  item?: string
  quantity?: number
  unit_price?: number
  line_total?: number
  notes?: string
}

type Order = {
  id: string
  customer_phone?: string
  customer_profile_name?: string
  customer_message?: string
  items?: OrderItem[]
  order_type?: string
  subtotal?: number
  payment_status?: string
  order_status?: string
  stripe_checkout_url?: string
  created_at?: string
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchOrders = async () => {
    setLoading(true)

    const res = await fetch('/api/orders', {
      cache: 'no-store',
    })

    const data = await res.json()

    if (data.success) {
      setOrders(data.orders)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const interval = setInterval(fetchOrders, 10000)

    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId)

    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, order_status: status }),
    })

    const data = await res.json()

    if (data.success) {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, order_status: status } : order
        )
      )
    } else {
      alert(data.message || 'Failed to update order')
    }

    setUpdatingId(null)
  }

  const stats = useMemo(() => {
    const today = new Date().toDateString()

    const todaysOrders = orders.filter((order) => {
      if (!order.created_at) return false
      return new Date(order.created_at).toDateString() === today
    })

    const paidOrders = orders.filter(
      (order) => order.payment_status === 'paid'
    )

    const todaysRevenue = todaysOrders
      .filter((order) => order.payment_status === 'paid')
      .reduce((sum, order) => sum + Number(order.subtotal || 0), 0)

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + Number(order.subtotal || 0),
      0
    )

    const newOrders = orders.filter(
      (order) => (order.order_status || 'new') === 'new'
    ).length

    return {
      todaysOrders: todaysOrders.length,
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      newOrders,
      todaysRevenue,
      totalRevenue,
    }
  }, [orders])

  const statusColor = (status?: string) => {
    if (status === 'paid') return '#16a34a'
    if (status === 'unpaid') return '#dc2626'
    if (status === 'pending') return '#ca8a04'
    return '#6b7280'
  }

  const orderStatusLabel = (status?: string) => {
    if (status === 'accepted') return 'Accepted'
    if (status === 'preparing') return 'Preparing'
    if (status === 'completed') return 'Completed'
    if (status === 'rejected') return 'Rejected'
    return 'New'
  }

  return (
    <main
      style={{
        padding: 30,
        fontFamily: 'Arial',
        background: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            alignItems: 'center',
            marginBottom: 25,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Orders Dashboard</h1>
            <p style={{ marginTop: 6, color: '#555' }}>
              Live WhatsApp AI orders, payments and kitchen status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/" style={linkButton}>
              Order Page
            </a>
            <a href="/menu" style={linkButton}>
              Menu
            </a>
            <a href="/menu-import" style={linkButton}>
              Import Menu
            </a>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 15,
            marginBottom: 25,
          }}
        >
          <StatCard title="Today Orders" value={stats.todaysOrders} />
          <StatCard title="New Orders" value={stats.newOrders} />
          <StatCard title="Paid Orders" value={stats.paidOrders} />
          <StatCard title="Today Revenue" value={`£${stats.todaysRevenue.toFixed(2)}`} />
          <StatCard title="Total Revenue" value={`£${stats.totalRevenue.toFixed(2)}`} />
          <StatCard title="All Orders" value={stats.totalOrders} />
        </section>

        {loading ? (
          <p>Loading orders...</p>
        ) : orders.length === 0 ? (
          <div style={emptyBox}>
            <h2>No orders yet</h2>
            <p>When WhatsApp orders come in, they will appear here.</p>
          </div>
        ) : (
          <section style={{ display: 'grid', gap: 18 }}>
            {orders.map((order) => (
              <div key={order.id} style={orderCard}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 15,
                    flexWrap: 'wrap',
                    marginBottom: 15,
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0 }}>
                      Order #{order.id.slice(0, 8)}
                    </h2>
                    <p style={{ margin: '6px 0', color: '#555' }}>
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : ''}
                    </p>
                    <p style={{ margin: '6px 0' }}>
                      <strong>Customer:</strong>{' '}
                      {order.customer_profile_name || 'WhatsApp Customer'}
                    </p>
                    <p style={{ margin: '6px 0' }}>
                      <strong>Phone:</strong> {order.customer_phone || '—'}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        ...badge,
                        background: statusColor(order.payment_status),
                      }}
                    >
                      {order.payment_status || 'pending'}
                    </div>

                    <div
                      style={{
                        ...badge,
                        background: '#111827',
                        marginTop: 8,
                      }}
                    >
                      {orderStatusLabel(order.order_status)}
                    </div>
                  </div>
                </div>

                {order.customer_message && (
                  <div style={messageBox}>
                    <strong>Customer message:</strong>
                    <p style={{ margin: '5px 0 0' }}>{order.customer_message}</p>
                  </div>
                )}

                <div style={{ marginTop: 15 }}>
                  <h3 style={{ marginBottom: 8 }}>Items</h3>

                  {(order.items || []).map((item, index) => {
                    const name = item.name || item.item || 'Item'
                    const quantity = Number(item.quantity || 1)
                    const lineTotal = Number(
                      item.line_total || Number(item.unit_price || 0) * quantity
                    )

                    return (
                      <div key={index} style={itemRow}>
                        <span>
                          {quantity} x {name}
                          {item.notes ? ` (${item.notes})` : ''}
                        </span>
                        <strong>£{lineTotal.toFixed(2)}</strong>
                      </div>
                    )
                  })}
                </div>

                <div style={summaryRow}>
                  <div>
                    <strong>Order type:</strong> {order.order_type || '—'}
                  </div>
                  <div>
                    <strong>Subtotal:</strong> £
                    {Number(order.subtotal || 0).toFixed(2)}
                  </div>
                </div>

                <div style={buttonRow}>
                  <button
                    onClick={() => updateStatus(order.id, 'accepted')}
                    disabled={updatingId === order.id}
                    style={button}
                  >
                    Accept
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    disabled={updatingId === order.id}
                    style={button}
                  >
                    Preparing
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, 'completed')}
                    disabled={updatingId === order.id}
                    style={greenButton}
                  >
                    Completed
                  </button>

                  <button
                    onClick={() => updateStatus(order.id, 'rejected')}
                    disabled={updatingId === order.id}
                    style={redButton}
                  >
                    Reject
                  </button>

                  {order.stripe_checkout_url && (
                    <a
                      href={order.stripe_checkout_url}
                      target="_blank"
                      style={outlineButton}
                    >
                      Payment Link
                    </a>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div style={statCard}>
      <p style={{ margin: 0, color: '#666', fontSize: 14 }}>{title}</p>
      <h2 style={{ margin: '8px 0 0', fontSize: 26 }}>{value}</h2>
    </div>
  )
}

const statCard: React.CSSProperties = {
  background: 'white',
  borderRadius: 14,
  padding: 18,
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const orderCard: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  padding: 22,
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
}

const badge: React.CSSProperties = {
  display: 'inline-block',
  color: 'white',
  padding: '7px 12px',
  borderRadius: 999,
  fontSize: 13,
  textTransform: 'capitalize',
  fontWeight: 'bold',
}

const messageBox: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
}

const itemRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  borderBottom: '1px solid #eee',
  padding: '9px 0',
}

const summaryRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 10,
  marginTop: 15,
  paddingTop: 15,
  borderTop: '2px solid #eee',
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginTop: 18,
}

const button: React.CSSProperties = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  background: '#111827',
  color: 'white',
  cursor: 'pointer',
}

const greenButton: React.CSSProperties = {
  ...button,
  background: '#16a34a',
}

const redButton: React.CSSProperties = {
  ...button,
  background: '#dc2626',
}

const outlineButton: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #111827',
  color: '#111827',
  textDecoration: 'none',
}

const linkButton: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  background: '#111827',
  color: 'white',
  textDecoration: 'none',
  fontSize: 14,
}

const emptyBox: React.CSSProperties = {
  background: 'white',
  borderRadius: 16,
  padding: 30,
  border: '1px solid #e5e7eb',
}