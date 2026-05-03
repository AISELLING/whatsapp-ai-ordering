'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function Dashboard() {
  const params = useSearchParams()
  const businessId = params.get('business_id')

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    if (!businessId) return

    const res = await fetch(`/api/orders?business_id=${businessId}`)
    const data = await res.json()

    if (data.success) {
      setOrders(data.orders)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [businessId])

  const revenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.subtotal || 0), 0)

  return (
    <div style={{ padding: 30 }}>
      <h1>Business Dashboard</h1>

      <p><strong>Business ID:</strong> {businessId}</p>

      <h2>Revenue: £{revenue.toFixed(2)}</h2>

      {loading && <p>Loading...</p>}

      {orders.map((order) => (
        <div
          key={order.id}
          style={{
            border: '1px solid #ddd',
            padding: 15,
            marginBottom: 10,
            borderRadius: 10,
          }}
        >
          <p><strong>Status:</strong> {order.payment_status}</p>
          <p><strong>Total:</strong> £{order.subtotal}</p>
          <p><strong>Type:</strong> {order.order_type}</p>
        </div>
      ))}
    </div>
  )
}