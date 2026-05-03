'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatusBadge } from '@/components/tek9'
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
      <section className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
          Operations
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Orders
        </h1>
        <p className="mt-2 text-slate-400">
          Review and manage orders for this business.
        </p>
      </section>

      {loading && (
        <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          Loading orders...
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </p>
      )}

      {!loading && orders.length === 0 ? (
        <GlowCard className="p-6">
          <h2 className="text-xl font-black text-white">No orders yet</h2>
          <p className="mt-2 text-slate-400">
            Orders will appear here once customers start ordering.
          </p>
        </GlowCard>
      ) : (
        <section className="grid gap-4">
          {orders.map((order) => (
            <GlowCard key={order.id} className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Order {order.id.slice(0, 8)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {order.customer_profile_name ||
                      order.customer_phone ||
                      'Customer'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {order.customer_phone || 'No phone'} ·{' '}
                    {formatDate(order.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={order.payment_status || 'pending'} />
                  <StatusBadge status={order.order_status || 'new'} />
                  <strong className="text-2xl font-black text-white">
                    £{Number(order.subtotal || 0).toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="my-5 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {(order.items || []).length === 0 ? (
                  <p className="text-sm text-slate-400">No items recorded.</p>
                ) : (
                  (order.items || []).map((item, index) => (
                    <div
                      key={`${order.id}-${index}`}
                      className="flex items-start justify-between gap-4 text-sm text-slate-300"
                    >
                      <span>
                        <strong className="text-white">
                          {Number(item.quantity || 1)} x {item.name || 'Item'}
                        </strong>
                        {item.notes ? (
                          <span className="text-slate-500"> ({item.notes})</span>
                        ) : null}
                      </span>
                      <strong className="text-white">
                        £{Number(item.line_total || item.unit_price || 0).toFixed(2)}
                      </strong>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Order status
                  </p>
                  <p className="mt-1 font-black capitalize text-white">
                    {(order.order_status || 'new').replaceAll('_', ' ')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => {
                    const active = (order.order_status || 'new') === status

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => updateStatus(order.id, status)}
                        disabled={updatingId === order.id}
                        className={`rounded-2xl border px-3 py-2 text-xs font-black capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-violet-300/30 bg-violet-400/20 text-white'
                            : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {statusLabel(status)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </GlowCard>
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
