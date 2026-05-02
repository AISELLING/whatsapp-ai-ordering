'use client'

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    const res = await fetch('/api/orders')
    const data = await res.json()

    if (data.orders) {
      setOrders(data.orders)
    }

    setLoading(false)
  }

  const updateStatus = async (id: string, order_status: string) => {
    await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status }),
    })

    fetchOrders()
  }

  useEffect(() => {
    fetchOrders()

    const interval = setInterval(() => {
      fetchOrders()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Orders Dashboard</h1>
      <p>Live orders from your AI WhatsApp ordering system.</p>

      <a href="/">← Back to order page</a>

      <br />
      <br />

      {loading && <p>Loading orders...</p>}

      {!loading && orders.length === 0 && <p>No orders yet.</p>}

      <div style={{ display: 'grid', gap: 20 }}>
        {orders.map((order) => (
          <div
            key={order.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 10,
              padding: 20,
              background: '#f9f9f9',
            }}
          >
            <h2>Order #{order.id.slice(0, 8)}</h2>

            <p>
              <strong>Status:</strong> {order.order_status || 'new'}
            </p>

            <p>
              <strong>Payment:</strong> {order.payment_status || 'pending'}
            </p>

            <p>
              <strong>Type:</strong> {order.order_type || 'Not selected'}
            </p>

            <p>
              <strong>Subtotal:</strong> £{Number(order.subtotal || 0).toFixed(2)}
            </p>

            <p>
              <strong>Customer message:</strong> {order.customer_message}
            </p>

            <h3>Items</h3>

            {order.items?.map((item: any, i: number) => (
              <div key={i}>
                {item.quantity} x {item.name} — £
                {Number(item.line_total || 0).toFixed(2)}
                {item.notes ? ` (${item.notes})` : ''}
              </div>
            ))}

            <br />

            <button
              onClick={() => updateStatus(order.id, 'accepted')}
              style={{
                marginRight: 10,
                padding: '10px 15px',
                background: 'black',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Accept
            </button>

            <button
              onClick={() => updateStatus(order.id, 'preparing')}
              style={{
                marginRight: 10,
                padding: '10px 15px',
                background: 'orange',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Preparing
            </button>

            <button
              onClick={() => updateStatus(order.id, 'completed')}
              style={{
                marginRight: 10,
                padding: '10px 15px',
                background: 'green',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Completed
            </button>

            <button
              onClick={() => updateStatus(order.id, 'rejected')}
              style={{
                padding: '10px 15px',
                background: 'red',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}