'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SaasAppHeader from '@/components/SaasAppHeader'
import { GlowCard, StatusBadge } from '@/components/tek9'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug?: string
  business_type?: string
  created_at?: string
}

export default function BusinessesPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBusinesses = async () => {
      const authHeaders = await getAuthHeaders()

      if (!authHeaders) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/businesses', {
        cache: 'no-store',
        headers: authHeaders,
      })
      const data = await res.json()

      if (data.success) {
        setBusinesses(data.businesses || [])
        setError('')
      } else if (res.status === 401) {
        router.replace('/login')
        return
      } else {
        setError(data.message || 'Failed to load businesses')
      }

      setLoading(false)
    }

    fetchBusinesses()
  }, [router])

  return (
    <main className="min-h-screen bg-[#0B0F1A] px-5 py-6 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_12%,rgba(168,85,247,0.18),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.12),transparent_26%)]" />
      <SaasAppHeader title="Businesses" />

      <section className="mx-auto mb-6 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
            Multi-business workspace
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
            Your Businesses
          </h2>
          <p className="mt-2 text-slate-400">
            Choose a business to manage orders, menus and setup.
          </p>
        </div>

        <a
          href="/onboarding"
          className="rounded-2xl bg-violet-400 px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-violet-300"
        >
          Create New Business
        </a>
      </section>

      <section className="mx-auto max-w-7xl">
        {loading && (
          <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
            Loading businesses...
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        )}

        {!loading && businesses.length === 0 ? (
          <GlowCard className="p-8">
            <h2 className="text-2xl font-black text-white">No businesses yet</h2>
            <p className="mt-2 max-w-2xl text-slate-400">
              Create your first business to unlock the dashboard, menu manager
              and WhatsApp AI ordering setup.
            </p>
            <a
              href="/onboarding"
              className="mt-6 inline-flex rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
            >
              Create New Business
            </a>
          </GlowCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {businesses.map((business) => {
              const businessId = encodeURIComponent(business.id)

              return (
                <GlowCard key={business.id} className="p-5">
                  <StatusBadge status={business.business_type || 'business'} />
                  <h2 className="mt-4 text-2xl font-black text-white">
                    {business.name}
                  </h2>
                  <p className="mt-2 break-all text-sm text-slate-500">
                    {business.slug || business.id}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <a
                      href={`/app/businesses/${businessId}/dashboard`}
                      className="rounded-2xl bg-violet-400 px-4 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-violet-300"
                    >
                      Dashboard
                    </a>
                    <a
                      href={`/app/businesses/${businessId}/menu`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Menu
                    </a>
                    <a
                      href={`/app/businesses/${businessId}/menu/import`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Import Menu
                    </a>
                    <a
                      href={`/app/businesses/${businessId}/settings`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Settings
                    </a>
                  </div>
                </GlowCard>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
