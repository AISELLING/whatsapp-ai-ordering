'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Business = {
  id: string
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const businessId = params.get('business_id')

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const resolveBusiness = async (authHeaders: { Authorization: string }) => {
    const res = await fetch('/api/businesses', {
      cache: 'no-store',
      headers: authHeaders,
    })
    const data = await res.json()

    if (!data.success) {
      throw new Error(data.message || 'Failed to load businesses')
    }

    const businesses = (data.businesses || []) as Business[]

    if (businesses.length === 1) {
      router.replace(
        `/dashboard?business_id=${encodeURIComponent(businesses[0].id)}`
      )
      return
    }

    router.replace('/onboarding')
  }

  const fetchOrders = async () => {
    setLoading(true)
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    if (!businessId) {
      try {
        await resolveBusiness(authHeaders)
      } catch (err: any) {
        setError(err.message || 'Failed to resolve business')
        setLoading(false)
      }

      return
    }

    const res = await fetch(`/api/orders?business_id=${businessId}`, {
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.success) {
      setOrders(data.orders)
      setError('')
    } else if (res.status === 401) {
      router.replace('/login')
      return
    } else if (res.status === 403) {
      router.replace('/onboarding')
      return
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
