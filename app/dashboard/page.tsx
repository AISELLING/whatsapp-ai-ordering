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
  const [filter, setFilter] = useState('all')

  const fetchOrders = async () => {
    const res = await fetch('/api/orders', { cache: 'no-store' })
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

    const todaysOrders = orders.filter(
      (order) =>
        order.created_at &&
        new Date(order.created_at).toDateString() === today
    )

    const paidOrders = orders.filter((o) => o.payment_status === 'paid')
    const pendingOrders = orders.filter((o) => o.payment_status !== 'paid')

    const todaysRevenue = todaysOrders
      .filter((o) => o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.subtotal || 0), 0)

    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + Number(o.subtotal || 0),
      0
    )

    return {
      today: todaysOrders.length,
      paid: paidOrders.length,
      pending: pendingOrders.length,
      total: orders.length,
      todaysRevenue,
      totalRevenue,
    }
  }, [orders])

  const filteredOrders = orders.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'paid') return order.payment_status === 'paid'
    if (filter === 'pending') return order.payment_status !== 'paid'
    return (order.order_status || 'new') === filter
  })

  return (
    <main style={page}>
      <aside style={sidebar}>
        <div>
          <div style={logoBox}>AI</div>
          <h2 style={brand}>AI Ordering</h2>
          <p style={brandSub}>WhatsApp commerce OS</p>
        </div>

        <nav style={nav}>
          <a style={navActive} href="/dashboard">Orders</a>
          <a style={navItem} href="/menu">Menu</a>
          <a style={navItem} href="/menu-import">Import Menu</a>
          <a style={navItem} href="/">Order Tester</a>
        </nav>

        <div style={sideFooter}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 12 }}>
            Live system
          </p>
          <strong style={{ color: '#22c55e' }}>Online</strong>
        </div>
      </aside>

      <section style={content}>
        <header style={topBar}>
          <div>
            <p style={eyebrow}>Operations Dashboard</p>
            <h1 style={title}>Live WhatsApp Orders</h1>
            <p style={subtitle}>
              Manage paid orders, kitchen flow, customers and revenue in real time.
            </p>
          </div>

          <button onClick={fetchOrders} style={refreshButton}>
            Refresh
          </button>
        </header>

        <section style={statsGrid}>
          <StatCard label="Today Revenue" value={`£${stats.todaysRevenue.toFixed(2)}`} accent />
          <StatCard label="Total Revenue" value={`£${stats.totalRevenue.toFixed(2)}`} />
          <StatCard label="Today Orders" value={stats.today} />
          <StatCard label="Paid Orders" value={stats.paid} />
          <StatCard label="Pending Payment" value={stats.pending} />
          <StatCard label="Total Orders" value={stats.total} />
        </section>

        <section style={filterBar}>
          {['all', 'paid', 'pending', 'new', 'accepted', 'preparing', 'completed', 'rejected'].map(
            (item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                style={filter === item ? filterActive : filterButton}
              >
                {item}
              </button>
            )
          )}
        </section>

        {loading ? (
          <div style={emptyState}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={emptyState}>
            <h2>No orders found</h2>
            <p>Orders will appear here when customers order via WhatsApp.</p>
          </div>
        ) : (
          <section style={ordersGrid}>
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                updatingId={updatingId}
                updateStatus={updateStatus}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

function OrderCard({
  order,
  updatingId,
  updateStatus,
}: {
  order: Order
  updatingId: string | null
  updateStatus: (id: string, status: string) => void
}) {
  const paymentPaid = order.payment_status === 'paid'
  const status = order.order_status || 'new'

  return (
    <article style={orderCard}>
      <div style={orderTop}>
        <div>
          <p style={orderNumber}>#{order.id.slice(0, 8).toUpperCase()}</p>
          <h2 style={customerName}>
            {order.customer_profile_name || 'WhatsApp Customer'}
          </h2>
          <p style={muted}>{order.customer_phone || 'No phone captured'}</p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={paymentPaid ? paidBadge : pendingBadge}>
            {paymentPaid ? 'Paid' : 'Pending'}
          </span>
          <br />
          <span style={statusBadge(status)}>{status}</span>
        </div>
      </div>

      <div style={metaRow}>
        <span>{order.created_at ? new Date(order.created_at).toLocaleString() : ''}</span>
        <span>{order.order_type || '—'}</span>
      </div>

      {order.customer_message && (
        <div style={messageBox}>
          <strong>Message</strong>
          <p>{order.customer_message}</p>
        </div>
      )}

      <div style={itemsBox}>
        {(order.items || []).map((item, index) => {
          const name = item.name || item.item || 'Item'
          const quantity = Number(item.quantity || 1)
          const lineTotal = Number(
            item.line_total || Number(item.unit_price || 0) * quantity
          )

          return (
            <div key={index} style={itemLine}>
              <span>
                {quantity} × {name}
                {item.notes ? <small> — {item.notes}</small> : null}
              </span>
              <strong>£{lineTotal.toFixed(2)}</strong>
            </div>
          )
        })}
      </div>

      <div style={totalRow}>
        <span>Total</span>
        <strong>£{Number(order.subtotal || 0).toFixed(2)}</strong>
      </div>

      <div style={actions}>
        <button
          style={actionButton}
          disabled={updatingId === order.id}
          onClick={() => updateStatus(order.id, 'accepted')}
        >
          Accept
        </button>
        <button
          style={actionButton}
          disabled={updatingId === order.id}
          onClick={() => updateStatus(order.id, 'preparing')}
        >
          Preparing
        </button>
        <button
          style={completeButton}
          disabled={updatingId === order.id}
          onClick={() => updateStatus(order.id, 'completed')}
        >
          Complete
        </button>
        <button
          style={rejectButton}
          disabled={updatingId === order.id}
          onClick={() => updateStatus(order.id, 'rejected')}
        >
          Reject
        </button>
      </div>
    </article>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div style={accent ? statAccent : statCard}>
      <p style={statLabel}>{label}</p>
      <h2 style={statValue}>{value}</h2>
    </div>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  background: '#0f172a',
  color: '#111827',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const sidebar: React.CSSProperties = {
  width: 260,
  background: '#020617',
  color: 'white',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  position: 'sticky',
  top: 0,
  height: '100vh',
}

const logoBox: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 14,
  background: 'linear-gradient(135deg, #22c55e, #38bdf8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
  marginBottom: 14,
}

const brand: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
}

const brandSub: React.CSSProperties = {
  color: '#94a3b8',
  marginTop: 6,
  fontSize: 13,
}

const nav: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  marginTop: 35,
}

const navItem: React.CSSProperties = {
  color: '#cbd5e1',
  textDecoration: 'none',
  padding: '12px 14px',
  borderRadius: 12,
  fontSize: 14,
}

const navActive: React.CSSProperties = {
  ...navItem,
  background: '#111827',
  color: 'white',
}

const sideFooter: React.CSSProperties = {
  borderTop: '1px solid #1e293b',
  paddingTop: 18,
}

const content: React.CSSProperties = {
  flex: 1,
  padding: 28,
  background: '#f8fafc',
  minHeight: '100vh',
}

const topBar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'center',
  marginBottom: 24,
}

const eyebrow: React.CSSProperties = {
  color: '#2563eb',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  fontSize: 36,
  margin: '6px 0',
}

const subtitle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
}

const refreshButton: React.CSSProperties = {
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 700,
}

const statsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
  gap: 14,
  marginBottom: 18,
}

const statCard: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  padding: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
}

const statAccent: React.CSSProperties = {
  ...statCard,
  background: 'linear-gradient(135deg, #020617, #1e293b)',
  color: 'white',
}

const statLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: '#64748b',
}

const statValue: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 28,
}

const filterBar: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginBottom: 20,
}

const filterButton: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  background: 'white',
  borderRadius: 999,
  padding: '9px 13px',
  cursor: 'pointer',
  textTransform: 'capitalize',
}

const filterActive: React.CSSProperties = {
  ...filterButton,
  background: '#020617',
  color: 'white',
  borderColor: '#020617',
}

const ordersGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: 18,
}

const orderCard: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
}

const orderTop: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 15,
}

const orderNumber: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
}

const customerName: React.CSSProperties = {
  margin: '5px 0',
  fontSize: 20,
}

const muted: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 14,
}

const paidBadge: React.CSSProperties = {
  display: 'inline-block',
  background: '#dcfce7',
  color: '#166534',
  border: '1px solid #bbf7d0',
  padding: '7px 10px',
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
}

const pendingBadge: React.CSSProperties = {
  ...paidBadge,
  background: '#fef9c3',
  color: '#854d0e',
  border: '1px solid #fde68a',
}

function statusBadge(status: string): React.CSSProperties {
  const colours: Record<string, string> = {
    new: '#2563eb',
    accepted: '#7c3aed',
    preparing: '#ea580c',
    completed: '#16a34a',
    rejected: '#dc2626',
  }

  return {
    display: 'inline-block',
    background: colours[status] || '#334155',
    color: 'white',
    padding: '7px 10px',
    borderRadius: 999,
    marginTop: 8,
    fontWeight: 800,
    fontSize: 12,
    textTransform: 'capitalize',
  }
}

const metaRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  color: '#64748b',
  fontSize: 13,
  marginTop: 16,
  borderTop: '1px solid #e2e8f0',
  paddingTop: 14,
  textTransform: 'capitalize',
}

const messageBox: React.CSSProperties = {
  marginTop: 14,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 13,
}

const itemsBox: React.CSSProperties = {
  marginTop: 14,
}

const itemLine: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  padding: '9px 0',
  borderBottom: '1px solid #f1f5f9',
}

const totalRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: 14,
  paddingTop: 14,
  borderTop: '2px solid #0f172a',
  fontSize: 18,
}

const actions: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 10,
  marginTop: 18,
}

const actionButton: React.CSSProperties = {
  background: '#0f172a',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  padding: '11px',
  cursor: 'pointer',
  fontWeight: 800,
}

const completeButton: React.CSSProperties = {
  ...actionButton,
  background: '#16a34a',
}

const rejectButton: React.CSSProperties = {
  ...actionButton,
  background: '#dc2626',
}

const emptyState: React.CSSProperties = {
  background: 'white',
  borderRadius: 22,
  border: '1px solid #e2e8f0',
  padding: 35,
  textAlign: 'center',
  color: '#64748b',
}