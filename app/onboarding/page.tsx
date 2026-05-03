'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GlowCard, StatusBadge, Tek9Logo } from '@/components/tek9'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug: string
  business_type: string
  phone?: string
  whatsapp_number?: string
  email?: string
  created_at?: string
}

const businessTypes = [
  ['restaurant', 'Restaurant'],
  ['coffee_shop', 'Coffee Shop'],
  ['shopify_store', 'Shopify Store'],
  ['auto_parts', 'Auto Parts'],
  ['supplements', 'Supplements'],
  ['other', 'Other'],
]

export default function OnboardingPage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [activeStep, setActiveStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    name: '',
    business_type: 'restaurant',
    phone: '',
    whatsapp_number: '',
    email: '',
    address: '',
    postcode: '',
  })

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
      setBusinesses(data.businesses)
      setError('')
    } else if (res.status === 401) {
      router.replace('/login')
      return
    } else {
      setError(data.message || 'Failed to load businesses')
      setBusinesses([])
    }

    setCheckingAuth(false)
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const createBusiness = async () => {
    if (!form.name.trim()) {
      setError('Business name required')
      return
    }

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    setLoading(false)

    if (data.error || !data.success) {
      setError(data.message || 'Failed to create business')
      return
    }

    setForm({
      name: '',
      business_type: 'restaurant',
      phone: '',
      whatsapp_number: '',
      email: '',
      address: '',
      postcode: '',
    })

    setMessage('Business created successfully. Add products next.')
    setActiveStep(2)
    fetchBusinesses()
  }

  if (checkingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B0F1A] p-6 text-white">
        <GlowCard className="p-8 text-slate-300">Loading onboarding...</GlowCard>
      </main>
    )
  }

  const latestBusiness = businesses[0]
  const latestBusinessId = latestBusiness ? encodeURIComponent(latestBusiness.id) : ''

  return (
    <main className="min-h-screen bg-[#0B0F1A] px-5 py-6 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_10%,rgba(168,85,247,0.2),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(34,211,238,0.12),transparent_28%)]" />
      <header className="mx-auto mb-8 flex max-w-7xl flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <Tek9Logo />
        <nav className="flex flex-wrap gap-3">
          <a
            href="/app/businesses"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Businesses
          </a>
          <a
            href="/app/account"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
          >
            Account
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-7xl">
        <div className="mb-8 max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
            Setup flow
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight text-white">
            Launch your tek9 workspace.
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            Create a business, prepare products and connect WhatsApp when your
            number is ready.
          </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {[
            [1, 'Business Type'],
            [2, 'Add Products'],
            [3, 'Connect WhatsApp'],
          ].map(([step, label]) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(Number(step))}
              className={`rounded-2xl border p-4 text-left transition ${
                activeStep === step
                  ? 'border-violet-300/40 bg-violet-400/15'
                  : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
              }`}
            >
              <span className="text-sm font-black text-cyan-200">Step {step}</span>
              <span className="mt-1 block text-lg font-black text-white">
                {label}
              </span>
            </button>
          ))}
        </div>

        {message && (
          <p className="mb-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        )}

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          {activeStep === 1 && (
            <GlowCard className="p-5">
              <h2 className="text-2xl font-black text-white">
                Step 1: Business Type
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {businessTypes.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, business_type: value })}
                    className={`rounded-2xl border p-4 text-left font-black transition ${
                      form.business_type === value
                        ? 'border-violet-300/40 bg-violet-400/15 text-white'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.07]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Business name">
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="Example: Richmond Coffee House"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                    placeholder="Business phone"
                    className={inputClass}
                  />
                </Field>
                <Field label="WhatsApp number">
                  <input
                    value={form.whatsapp_number}
                    onChange={(event) =>
                      setForm({ ...form, whatsapp_number: event.target.value })
                    }
                    placeholder="WhatsApp number"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                    placeholder="Business email"
                    className={inputClass}
                  />
                </Field>
                <Field label="Main branch address">
                  <input
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                    placeholder="Address"
                    className={inputClass}
                  />
                </Field>
                <Field label="Postcode">
                  <input
                    value={form.postcode}
                    onChange={(event) =>
                      setForm({ ...form, postcode: event.target.value })
                    }
                    placeholder="Postcode"
                    className={inputClass}
                  />
                </Field>
              </div>

              <button
                onClick={createBusiness}
                disabled={loading}
                className="mt-6 rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create Business'}
              </button>
            </GlowCard>
          )}

          {activeStep === 2 && (
            <GlowCard className="p-5">
              <h2 className="text-2xl font-black text-white">
                Step 2: Add Products
              </h2>
              <p className="mt-2 max-w-2xl text-slate-400">
                Build the menu that tek9 uses to parse customer orders and
                suggest relevant products.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {['Classic Burger', 'Flat White', 'Protein Bundle'].map(
                  (product) => (
                    <div
                      key={product}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <p className="font-black text-white">{product}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Example product card
                      </p>
                    </div>
                  )
                )}
              </div>
              {latestBusiness ? (
                <a
                  href={`/app/businesses/${latestBusinessId}/menu`}
                  className="mt-6 inline-flex rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
                >
                  Open Menu Builder
                </a>
              ) : (
                <p className="mt-6 text-sm text-slate-400">
                  Create a business first to open the menu builder.
                </p>
              )}
            </GlowCard>
          )}

          {activeStep === 3 && (
            <GlowCard className="p-5">
              <h2 className="text-2xl font-black text-white">
                Step 3: Connect WhatsApp
              </h2>
              <p className="mt-2 max-w-2xl text-slate-400">
                Add the business WhatsApp number now. The webhook connection UI
                can be completed once the WhatsApp engine is ready.
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                  Connection status
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  Placeholder setup
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This keeps onboarding functional without inventing backend
                  WhatsApp connection state.
                </p>
              </div>
              {latestBusiness ? (
                <a
                  href={`/app/businesses/${latestBusinessId}/settings`}
                  className="mt-6 inline-flex rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
                >
                  Review Business Settings
                </a>
              ) : null}
            </GlowCard>
          )}

          <GlowCard className="p-5">
            <h2 className="text-2xl font-black text-white">
              Existing Businesses
            </h2>
            <div className="mt-5 grid gap-3">
              {businesses.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  No businesses created yet.
                </p>
              ) : (
                businesses.map((business) => {
                  const businessId = encodeURIComponent(business.id)

                  return (
                    <div
                      key={business.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <StatusBadge status={business.business_type} />
                      <h3 className="mt-3 font-black text-white">
                        {business.name}
                      </h3>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {business.slug}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={`/app/businesses/${businessId}/dashboard`}
                          className="rounded-2xl bg-violet-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-violet-300"
                        >
                          Dashboard
                        </a>
                        <a
                          href={`/app/businesses/${businessId}/menu/import`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10"
                        >
                          Import Menu
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </GlowCard>
        </section>
      </section>
    </main>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50'
