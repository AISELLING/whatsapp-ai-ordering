'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatCard, StatusBadge } from '@/components/tek9'
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

  const activeChats = new Set(
    orders
      .filter(
        (order) =>
          !['completed', 'rejected'].includes(order.order_status || 'new')
      )
      .map((order) => order.customer_phone || order.id)
  ).size

  const topProducts = useMemo(() => {
    const totals = new Map<string, number>()

    orders.forEach((order) => {
      ;(order.items || []).forEach((item) => {
        const name = item.name || 'Item'
        totals.set(name, (totals.get(name) || 0) + Number(item.quantity || 1))
      })
    })

    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [orders])

  const encodedBusinessId = encodeURIComponent(businessId)
  const recentOrders = orders.slice(0, 6)

  return (
    <>
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
            Workspace
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Live order performance for this business.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={`/app/businesses/${encodedBusinessId}/orders`}
            className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
          >
            View All Orders
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/menu`}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Manage Menu
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/menu/import`}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Import Menu
          </a>
        </div>
      </section>

      {loading && (
        <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          Loading dashboard...
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={`£${revenue.toFixed(2)}`}
          hint="Paid orders only"
        />
        <StatCard
          label="Orders"
          value={orders.length}
          hint="Total orders loaded"
        />
        <StatCard
          label="Active chats"
          value={activeChats}
          hint="Open customer conversations"
        />
        <StatCard
          label="Business ID"
          value={<span className="break-all text-lg">{businessId}</span>}
          hint="Workspace identifier"
        />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <GlowCard className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Recent Orders</h2>
              <p className="mt-1 text-sm text-slate-400">
                The latest WhatsApp orders in this workspace.
              </p>
            </div>
            <a
              href={`/app/businesses/${encodedBusinessId}/orders`}
              className="text-sm font-black text-cyan-200"
            >
              Full Orders Page
            </a>
          </div>

          {!loading && recentOrders.length === 0 ? (
            <div className="p-6">
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
                <h3 className="text-lg font-black text-white">No orders yet</h3>
                <p className="mt-2 text-slate-400">
                  Orders will appear here once customers start placing them
                  through your WhatsApp AI ordering flow.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Items</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="text-slate-300">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">
                          {order.customer_profile_name ||
                            order.customer_phone ||
                            `Order ${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(order.created_at)}
                        </p>
                      </td>
                      <td className="px-5 py-4">{formatItems(order.items)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.order_status || 'new'} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.payment_status || 'pending'} />
                      </td>
                      <td className="px-5 py-4 text-right font-black text-white">
                        £{Number(order.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="text-xl font-black text-white">Top Products</h2>
          <p className="mt-1 text-sm text-slate-400">
            Based on quantities in loaded orders.
          </p>
          <div className="mt-5 grid gap-3">
            {topProducts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                Top products will appear after orders arrive.
              </p>
            ) : (
              topProducts.map(([name, quantity], index) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div>
                    <p className="text-xs font-black text-cyan-200">
                      #{index + 1}
                    </p>
                    <p className="mt-1 font-bold text-white">{name}</p>
                  </div>
                  <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-sm font-black text-violet-100">
                    {quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlowCard>
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

function formatDate(value?: string) {
  if (!value) return 'Unknown date'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
