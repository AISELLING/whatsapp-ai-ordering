'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatusBadge } from '@/components/tek9'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type SettingsForm = {
  name: string
  business_type: string
  phone: string
  whatsapp_number: string
  email: string
  address: string
  postcode: string
  delivery_enabled: boolean
  collection_enabled: boolean
  delivery_radius: string
  delivery_fee: string
  free_delivery_threshold: string
  default_prep_time: string
  cash_on_delivery_enabled: boolean
  stripe_enabled: boolean
  ai_greeting_message: string
  shopify_shop_domain: string
  shopify_admin_access_token: string
  shopify_connected: boolean
  shopify_last_sync_at: string
}

type ShopifySyncJob = {
  id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  total_products?: number
  total_variants?: number
  processed_products?: number
  processed_variants?: number
  imported_count?: number
  updated_count?: number
  skipped_count?: number
  failed_count?: number
  warning_count?: number
  warnings?: string[]
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at?: string
  updated_at?: string
}

const emptyForm: SettingsForm = {
  name: '',
  business_type: 'restaurant',
  phone: '',
  whatsapp_number: '',
  email: '',
  address: '',
  postcode: '',
  delivery_enabled: true,
  collection_enabled: true,
  delivery_radius: '3',
  delivery_fee: '0',
  free_delivery_threshold: '0',
  default_prep_time: '20',
  cash_on_delivery_enabled: false,
  stripe_enabled: true,
  ai_greeting_message: 'Hi! What would you like to order today?',
  shopify_shop_domain: '',
  shopify_admin_access_token: '',
  shopify_connected: false,
  shopify_last_sync_at: '',
}

export default function SettingsPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingShopify, setTestingShopify] = useState(false)
  const [startingSync, setStartingSync] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [shopifyMessage, setShopifyMessage] = useState('')
  const [shopifyError, setShopifyError] = useState('')
  const [syncJob, setSyncJob] = useState<ShopifySyncJob | null>(null)
  const syncTickInFlight = useRef(false)

  const syncIsRunning =
    syncJob?.status === 'queued' || syncJob?.status === 'running'

  const progressPercent = useMemo(() => {
    if (!syncJob) return 0

    const totalProducts = Number(syncJob.total_products || 0)
    const processedProducts = Number(syncJob.processed_products || 0)

    if (totalProducts <= 0) {
      return syncIsRunning ? 12 : syncJob.status === 'completed' ? 100 : 0
    }

    return Math.min(100, Math.round((processedProducts / totalProducts) * 100))
  }, [syncJob, syncIsRunning])

  useEffect(() => {
    const loadSettings = async () => {
      const authHeaders = await getAuthHeaders()

      if (!authHeaders) {
        router.replace('/login')
        return
      }

      const res = await fetch(`/api/businesses/${businessId}/settings`, {
        cache: 'no-store',
        headers: authHeaders,
      })
      const data = await res.json()

      if (data.success) {
        setForm({
          name: data.business.name || '',
          business_type: data.business.business_type || 'restaurant',
          phone: data.business.phone || '',
          whatsapp_number: data.business.whatsapp_number || '',
          email: data.business.email || '',
          address: data.branch?.address || '',
          postcode: data.branch?.postcode || '',
          delivery_enabled: Boolean(data.business.delivery_enabled),
          collection_enabled: Boolean(data.business.collection_enabled),
          delivery_radius: String(data.business.delivery_radius ?? 0),
          delivery_fee: String(data.business.delivery_fee ?? 0),
          free_delivery_threshold: String(
            data.business.free_delivery_threshold ?? 0
          ),
          default_prep_time: String(data.business.default_prep_time ?? 20),
          cash_on_delivery_enabled: Boolean(
            data.business.cash_on_delivery_enabled
          ),
          stripe_enabled: Boolean(data.business.stripe_enabled),
          ai_greeting_message: data.business.ai_greeting_message || '',
          shopify_shop_domain: data.business.shopify_shop_domain || '',
          shopify_admin_access_token:
            data.business.shopify_admin_access_token || '',
          shopify_connected: Boolean(data.business.shopify_connected),
          shopify_last_sync_at: data.business.shopify_last_sync_at || '',
        })
        setError('')
      } else if (res.status === 401) {
        router.replace('/login')
        return
      } else if (res.status === 403) {
        router.replace('/app/businesses')
        return
      } else {
        setError(data.message || 'Failed to load settings')
      }

      setLoading(false)
    }

    loadSettings()
  }, [businessId, router])

  useEffect(() => {
    if (!syncJob?.id || !syncIsRunning) {
      return
    }

    const tick = async () => {
      if (syncTickInFlight.current) {
        return
      }

      syncTickInFlight.current = true
      try {
        const latest = await fetchSyncJob(syncJob.id)

        if (!latest) {
          return
        }

        setSyncJob(latest)

        if (latest.status === 'queued' || latest.status === 'running') {
          await processNextSyncChunk(latest.id)
          const afterChunk = await fetchSyncJob(latest.id)

          if (afterChunk) {
            setSyncJob(afterChunk)
            if (afterChunk.status === 'completed') {
              setShopifyMessage('Shopify sync completed.')
              setForm((current) => ({
                ...current,
                shopify_connected: true,
                shopify_last_sync_at:
                  afterChunk.completed_at || current.shopify_last_sync_at,
              }))
            }

            if (afterChunk.status === 'failed') {
              setShopifyError(afterChunk.error_message || 'Shopify sync failed.')
            }
          }
        }
      } finally {
        syncTickInFlight.current = false
      }
    }

    tick()
    const interval = window.setInterval(tick, 1800)
    return () => window.clearInterval(interval)
  }, [syncJob?.id, syncIsRunning])

  const updateForm = (updates: Partial<SettingsForm>) => {
    setForm((current) => ({ ...current, ...updates }))
  }

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    setShopifyMessage('')
    setShopifyError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/businesses/${businessId}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    setSaving(false)

    if (data.success) {
      setMessage('Settings saved successfully.')
      updateForm({
        shopify_shop_domain: data.business.shopify_shop_domain || '',
        shopify_admin_access_token:
          data.business.shopify_admin_access_token || '',
        shopify_connected: Boolean(data.business.shopify_connected),
        shopify_last_sync_at: data.business.shopify_last_sync_at || '',
      })
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

    setError(data.message || 'Failed to save settings')
  }

  const testShopifyConnection = async () => {
    setTestingShopify(true)
    setShopifyMessage('')
    setShopifyError('')
    setMessage('')
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/businesses/${businessId}/shopify/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        shopify_shop_domain: form.shopify_shop_domain,
        shopify_admin_access_token: form.shopify_admin_access_token,
      }),
    })
    const data = await res.json()

    setTestingShopify(false)

    if (data.success) {
      updateForm({
        shopify_shop_domain: data.shopify_shop_domain || form.shopify_shop_domain,
        shopify_connected: true,
        shopify_last_sync_at: data.shopify_last_sync_at || '',
      })
      setShopifyMessage(
        data.shop?.name
          ? `Connected to ${data.shop.name}.`
          : 'Shopify connection successful.'
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

    updateForm({ shopify_connected: false })
    setShopifyError(data.message || 'Failed to test Shopify connection')
  }

  const startShopifySync = async () => {
    setStartingSync(true)
    setShopifyMessage('')
    setShopifyError('')
    setMessage('')
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(
      `/api/businesses/${businessId}/shopify/sync-products`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      }
    )
    const data = await res.json()
    console.log('Shopify sync response', data)

    setStartingSync(false)

    if (data.success && data.jobId) {
      setSyncJob({
        id: data.jobId,
        status: 'queued',
        processed_products: 0,
        processed_variants: 0,
        imported_count: 0,
        updated_count: 0,
        skipped_count: 0,
        failed_count: 0,
        warning_count: 0,
        warnings: [],
        started_at: new Date().toISOString(),
      })
      setShopifyMessage(
        data.alreadyRunning
          ? 'An existing Shopify sync resumed.'
          : 'Shopify sync job created. Processing pages...'
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

    setShopifyError(data.message || 'Failed to start Shopify sync')
  }

  const fetchSyncJob = async (jobId: string): Promise<ShopifySyncJob | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return null
    }

    const res = await fetch(
      `/api/businesses/${businessId}/shopify/sync-jobs/${jobId}`,
      {
        cache: 'no-store',
        headers: authHeaders,
      }
    )
    const data = await res.json()

    if (data.success) {
      return data.job as ShopifySyncJob
    }

    if (res.status === 401) {
      router.replace('/login')
    }

    if (res.status === 403) {
      router.replace('/app/businesses')
    }

    return null
  }

  const processNextSyncChunk = async (jobId: string) => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(
      `/api/businesses/${businessId}/shopify/sync-jobs/${jobId}/process-next`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      }
    )
    const data = await res.json()

    if (!data.success && data.error) {
      setShopifyError(data.message || 'Failed to process Shopify sync chunk')
    }
  }

  if (loading) {
    return (
      <GlowCard className="p-5">
        <p className="text-slate-300">Loading settings...</p>
      </GlowCard>
    )
  }

  return (
    <form onSubmit={saveSettings} className="grid gap-5">
      <GlowCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
              Settings
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
              Business Settings
            </h1>
            <p className="mt-2 max-w-2xl text-slate-400">
              Manage business details, fulfilment, payments, AI messaging and
              integrations.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        )}
      </GlowCard>

      <section className="grid gap-5 xl:grid-cols-2">
        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">Business Details</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Business name">
              <input
                value={form.name}
                onChange={(event) => updateForm({ name: event.target.value })}
                className={inputClass}
                required
              />
            </Field>

            <Field label="Business type">
              <select
                value={form.business_type}
                onChange={(event) =>
                  updateForm({ business_type: event.target.value })
                }
                className={inputClass}
              >
                <option value="restaurant">Restaurant / Takeaway</option>
                <option value="coffee_shop">Coffee Shop</option>
                <option value="shopify_store">Shopify Store</option>
                <option value="car_parts">Car Parts Distributor</option>
                <option value="service_business">Service Business</option>
                <option value="franchise">Franchise / Multi-branch</option>
              </select>
            </Field>

            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(event) => updateForm({ phone: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="WhatsApp number">
              <input
                value={form.whatsapp_number}
                onChange={(event) =>
                  updateForm({ whatsapp_number: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateForm({ email: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">Shopify Integration</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge
              status={form.shopify_connected ? 'connected' : 'not connected'}
            />
            {form.shopify_last_sync_at ? (
              <span className="text-sm text-slate-500">
                Last sync {formatDate(form.shopify_last_sync_at)}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Shop domain">
              <input
                value={form.shopify_shop_domain}
                onChange={(event) =>
                  updateForm({
                    shopify_shop_domain: event.target.value,
                    shopify_connected: false,
                  })
                }
                placeholder="your-store.myshopify.com"
                className={inputClass}
              />
            </Field>

            <Field label="Admin access token">
              <input
                type="password"
                value={form.shopify_admin_access_token}
                onChange={(event) =>
                  updateForm({
                    shopify_admin_access_token: event.target.value,
                    shopify_connected: false,
                  })
                }
                placeholder="shpat_..."
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={testShopifyConnection}
              disabled={testingShopify || syncIsRunning || startingSync}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testingShopify ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="button"
              onClick={startShopifySync}
              disabled={syncIsRunning || startingSync || testingShopify}
              className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncIsRunning
                ? 'Sync Running...'
                : startingSync
                  ? 'Starting...'
                  : syncJob?.status === 'failed'
                    ? 'Retry Shopify Sync'
                    : 'Sync Shopify Products'}
            </button>
            <button
              type="submit"
              disabled={saving || syncIsRunning}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Shopify Fields
            </button>
          </div>

          {shopifyMessage && (
            <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
              {shopifyMessage}
            </p>
          )}
          {shopifyError && (
            <p className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
              {shopifyError}
            </p>
          )}

          {syncJob && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-400">
                    Sync status
                  </p>
                  <p className="mt-1 text-xl font-black capitalize text-white">
                    {syncJob.status}
                  </p>
                </div>
                <StatusBadge status={syncJob.status} />
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {progressPercent}% complete
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SyncMetric
                  label="Processed products"
                  value={syncJob.processed_products || 0}
                  suffix={
                    syncJob.total_products ? ` / ${syncJob.total_products}` : ''
                  }
                />
                <SyncMetric
                  label="Processed variants"
                  value={syncJob.processed_variants || 0}
                  suffix={
                    syncJob.total_variants ? ` / ${syncJob.total_variants}` : ''
                  }
                />
                <SyncMetric
                  label="Imported"
                  value={syncJob.imported_count || 0}
                />
                <SyncMetric
                  label="Updated"
                  value={syncJob.updated_count || 0}
                />
                <SyncMetric
                  label="Skipped"
                  value={syncJob.skipped_count || 0}
                />
                <SyncMetric label="Failed" value={syncJob.failed_count || 0} />
                <SyncMetric
                  label="Warnings"
                  value={syncJob.warning_count || 0}
                />
                <SyncMetric
                  label="Started"
                  value={
                    syncJob.started_at ? formatShortTime(syncJob.started_at) : '-'
                  }
                />
              </div>

              {syncJob.error_message && (
                <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                  {syncJob.error_message}
                </div>
              )}

              {(syncJob.warnings || []).length > 0 && (
                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                  <p className="text-sm font-black text-amber-100">
                    Sync warnings
                  </p>
                  <ul className="mt-3 grid max-h-48 gap-2 overflow-auto text-sm text-amber-100">
                    {(syncJob.warnings || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="mt-5 text-sm leading-6 text-slate-500">
            Shopify sync imports every Shopify variant as one sellable product
            and updates existing Shopify-linked rows by variant ID. Manual menu
            products stay untouched.
          </p>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">Main Branch</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Address">
              <input
                value={form.address}
                onChange={(event) => updateForm({ address: event.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="Postcode">
              <input
                value={form.postcode}
                onChange={(event) => updateForm({ postcode: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <h2 className="mt-8 text-2xl font-black text-white">Fulfilment</h2>

          <div className="mt-5 grid gap-3">
            <Toggle
              label="Delivery enabled"
              checked={form.delivery_enabled}
              onChange={(checked) => updateForm({ delivery_enabled: checked })}
            />
            <Toggle
              label="Collection enabled"
              checked={form.collection_enabled}
              onChange={(checked) => updateForm({ collection_enabled: checked })}
            />
          </div>
        </GlowCard>

        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">Delivery Rules</h2>

          <div className="mt-5 grid gap-4">
            <Field label="Delivery radius">
              <input
                type="number"
                step="0.1"
                value={form.delivery_radius}
                onChange={(event) =>
                  updateForm({ delivery_radius: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Delivery fee">
              <input
                type="number"
                step="0.01"
                value={form.delivery_fee}
                onChange={(event) =>
                  updateForm({ delivery_fee: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Free delivery threshold">
              <input
                type="number"
                step="0.01"
                value={form.free_delivery_threshold}
                onChange={(event) =>
                  updateForm({ free_delivery_threshold: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Default prep time">
              <input
                type="number"
                step="1"
                value={form.default_prep_time}
                onChange={(event) =>
                  updateForm({ default_prep_time: event.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>
        </GlowCard>

        <GlowCard className="p-5 xl:col-span-2">
          <h2 className="text-2xl font-black text-white">Payments and AI</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Toggle
              label="Cash on delivery enabled"
              checked={form.cash_on_delivery_enabled}
              onChange={(checked) =>
                updateForm({ cash_on_delivery_enabled: checked })
              }
            />
            <Toggle
              label="Stripe enabled"
              checked={form.stripe_enabled}
              onChange={(checked) => updateForm({ stripe_enabled: checked })}
            />
          </div>

          <div className="mt-5">
            <Field label="AI greeting message">
              <textarea
                value={form.ai_greeting_message}
                onChange={(event) =>
                  updateForm({ ai_greeting_message: event.target.value })
                }
                className={`${inputClass} min-h-32 resize-y`}
              />
            </Field>
          </div>
        </GlowCard>
      </section>
    </form>
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-200">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-violet-400"
      />
    </label>
  )
}

function SyncMetric({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: string | number
  suffix?: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">
        {value}
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </p>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50'
