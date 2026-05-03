'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

function DashboardContent() {
  const params = useSearchParams()
  const businessId = params.get('business_id')

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = async () => {
    if (!businessId) {
      setError('business_id required')
      setLoading(false)
      return
    }

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      setError('Please sign in to view this dashboard.')
      setLoading(false)
      return
    }

    const res = await fetch(`/api/orders?business_id=${businessId}`, {
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.success) {
      setOrders(data.orders)
      setError('')
    } else {
      setError(data.message || 'Failed to load orders')
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
      {error && <p style={{ color: 'red' }}>{error}</p>}

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

export default function Dashboard() {
  return (
    <Suspense fallback={<p style={{ padding: 30 }}>Loading...</p>}>
      <DashboardContent />
    </Suspense>
  )
}
