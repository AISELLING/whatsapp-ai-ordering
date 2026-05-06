'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatusBadge } from '@/components/tek9'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Booking = {
  id: string
  customer_phone?: string
  customer_name?: string
  service?: string
  dog_breed?: string
  dog_size?: string
  requested_date?: string
  requested_time?: string
  notes?: string
  status?: string
  created_at?: string
}

const statuses = ['pending', 'accepted', 'confirmed', 'completed', 'rejected']

export default function BookingsPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')

  const loadBookings = async () => {
    setLoading(true)
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/bookings?business_id=${businessId}`, {
      cache: 'no-store',
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.success) {
      setBookings(data.bookings || [])
    } else if (res.status === 401) {
      router.replace('/login')
      return
    } else if (res.status === 403) {
      router.replace('/app/businesses')
      return
    } else {
      setError(data.message || 'Failed to load bookings')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadBookings()
  }, [businessId])

  const updateStatus = async (bookingId: string, status: string) => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setUpdatingId(bookingId)
    setError('')

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        business_id: businessId,
        status,
      }),
    })
    const data = await res.json()

    setUpdatingId('')

    if (data.success) {
      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
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

    setError(data.message || 'Failed to update booking status')
  }

  return (
    <>
      <section className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
          Operations
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Bookings
        </h1>
        <p className="mt-2 text-slate-400">
          Manage WhatsApp booking requests for this business.
        </p>
      </section>

      {loading && (
        <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          Loading bookings...
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </p>
      )}

      {!loading && bookings.length === 0 ? (
        <GlowCard className="p-6">
          <h2 className="text-xl font-black text-white">No bookings yet</h2>
          <p className="mt-2 text-slate-400">
            Booking requests from WhatsApp will appear here.
          </p>
        </GlowCard>
      ) : (
        <section className="grid gap-4">
          {bookings.map((booking) => (
            <GlowCard key={booking.id} className="p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                    Booking {booking.id.slice(0, 8)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {booking.customer_name || 'Customer'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {booking.customer_phone || 'No phone'} ·{' '}
                    {formatDate(booking.created_at)}
                  </p>
                </div>

                <StatusBadge status={booking.status || 'pending'} />
              </div>

              <div className="my-5 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                <p>
                  <strong className="text-white">Service:</strong>{' '}
                  {booking.service || 'Not provided'}
                </p>
                <p>
                  <strong className="text-white">Date/Time:</strong>{' '}
                  {[booking.requested_date, booking.requested_time]
                    .filter(Boolean)
                    .join(' ') || 'Not provided'}
                </p>
                <p>
                  <strong className="text-white">Dog:</strong>{' '}
                  {[booking.dog_breed, booking.dog_size].filter(Boolean).join(' / ') ||
                    'Not provided'}
                </p>
                <p>
                  <strong className="text-white">Notes:</strong>{' '}
                  {booking.notes || 'None'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => {
                  const active = (booking.status || 'pending') === status

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatus(booking.id, status)}
                      disabled={updatingId === booking.id}
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
            </GlowCard>
          ))}
        </section>
      )}
    </>
  )
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
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
