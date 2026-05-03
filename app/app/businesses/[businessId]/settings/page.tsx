'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
}

export default function SettingsPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const updateForm = (updates: Partial<SettingsForm>) => {
    setForm((current) => ({ ...current, ...updates }))
  }

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

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

  if (loading) {
    return <p style={notice}>Loading settings...</p>
  }

  return (
    <form onSubmit={saveSettings} style={formLayout}>
      <section style={panel}>
        <div style={sectionHeader}>
          <div>
            <p style={eyebrow}>Settings</p>
            <h1 style={title}>Business Settings</h1>
            <p style={muted}>
              Manage business details, fulfilment, payments and AI messaging.
            </p>
          </div>

          <button type="submit" disabled={saving} style={primaryButton}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {message && <p style={successText}>{message}</p>}
        {error && <p style={errorText}>{error}</p>}
      </section>

      <section style={grid}>
        <div style={panel}>
          <h2 style={cardTitle}>Business Details</h2>

          <label style={label}>Business name</label>
          <input
            value={form.name}
            onChange={(event) => updateForm({ name: event.target.value })}
            style={input}
            required
          />

          <label style={label}>Business type</label>
          <select
            value={form.business_type}
            onChange={(event) =>
              updateForm({ business_type: event.target.value })
            }
            style={input}
          >
            <option value="restaurant">Restaurant / Takeaway</option>
            <option value="coffee_shop">Coffee Shop</option>
            <option value="shopify_store">Shopify Store</option>
            <option value="car_parts">Car Parts Distributor</option>
            <option value="service_business">Service Business</option>
            <option value="franchise">Franchise / Multi-branch</option>
          </select>

          <label style={label}>Phone</label>
          <input
            value={form.phone}
            onChange={(event) => updateForm({ phone: event.target.value })}
            style={input}
          />

          <label style={label}>WhatsApp number</label>
          <input
            value={form.whatsapp_number}
            onChange={(event) =>
              updateForm({ whatsapp_number: event.target.value })
            }
            style={input}
          />

          <label style={label}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm({ email: event.target.value })}
            style={input}
          />
        </div>

        <div style={panel}>
          <h2 style={cardTitle}>Main Branch</h2>

          <label style={label}>Address</label>
          <input
            value={form.address}
            onChange={(event) => updateForm({ address: event.target.value })}
            style={input}
          />

          <label style={label}>Postcode</label>
          <input
            value={form.postcode}
            onChange={(event) => updateForm({ postcode: event.target.value })}
            style={input}
          />

          <h2 style={cardTitle}>Fulfilment</h2>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={form.delivery_enabled}
              onChange={(event) =>
                updateForm({ delivery_enabled: event.target.checked })
              }
            />
            Delivery enabled
          </label>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={form.collection_enabled}
              onChange={(event) =>
                updateForm({ collection_enabled: event.target.checked })
              }
            />
            Collection enabled
          </label>
        </div>

        <div style={panel}>
          <h2 style={cardTitle}>Delivery Rules</h2>

          <label style={label}>Delivery radius</label>
          <input
            type="number"
            step="0.1"
            value={form.delivery_radius}
            onChange={(event) =>
              updateForm({ delivery_radius: event.target.value })
            }
            style={input}
          />

          <label style={label}>Delivery fee</label>
          <input
            type="number"
            step="0.01"
            value={form.delivery_fee}
            onChange={(event) => updateForm({ delivery_fee: event.target.value })}
            style={input}
          />

          <label style={label}>Free delivery threshold</label>
          <input
            type="number"
            step="0.01"
            value={form.free_delivery_threshold}
            onChange={(event) =>
              updateForm({ free_delivery_threshold: event.target.value })
            }
            style={input}
          />

          <label style={label}>Default prep time</label>
          <input
            type="number"
            step="1"
            value={form.default_prep_time}
            onChange={(event) =>
              updateForm({ default_prep_time: event.target.value })
            }
            style={input}
          />
        </div>

        <div style={panel}>
          <h2 style={cardTitle}>Payments and AI</h2>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={form.cash_on_delivery_enabled}
              onChange={(event) =>
                updateForm({ cash_on_delivery_enabled: event.target.checked })
              }
            />
            Cash on delivery enabled
          </label>

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={form.stripe_enabled}
              onChange={(event) =>
                updateForm({ stripe_enabled: event.target.checked })
              }
            />
            Stripe enabled
          </label>

          <label style={label}>AI greeting message</label>
          <textarea
            value={form.ai_greeting_message}
            onChange={(event) =>
              updateForm({ ai_greeting_message: event.target.value })
            }
            style={textarea}
            rows={5}
          />
        </div>
      </section>
    </form>
  )
}

const formLayout: React.CSSProperties = {
  display: 'grid',
  gap: 18,
}

const panel: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

const eyebrow: React.CSSProperties = {
  color: '#075985',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 900,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  color: '#020617',
  margin: '8px 0',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  lineHeight: 1.5,
  margin: 0,
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 18,
}

const cardTitle: React.CSSProperties = {
  color: '#020617',
  marginTop: 0,
}

const label: React.CSSProperties = {
  display: 'block',
  fontWeight: 800,
  fontSize: 13,
  color: '#0f172a',
  marginBottom: 6,
  marginTop: 12,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  fontSize: 15,
  boxSizing: 'border-box',
}

const textarea: React.CSSProperties = {
  ...input,
  resize: 'vertical',
}

const checkboxLabel: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  fontWeight: 800,
  color: '#0f172a',
  marginTop: 14,
}

const primaryButton: React.CSSProperties = {
  padding: '11px 14px',
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 900,
}

const notice: React.CSSProperties = {
  color: '#64748b',
}

const successText: React.CSSProperties = {
  color: '#166534',
  background: '#dcfce7',
  border: '1px solid #bbf7d0',
  borderRadius: 12,
  padding: 12,
  marginBottom: 0,
}

const errorText: React.CSSProperties = {
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
  marginBottom: 0,
}
