'use client'

import { useEffect, useState } from 'react'

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

export default function OnboardingPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(false)
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
    const res = await fetch('/api/businesses', { cache: 'no-store' })
    const data = await res.json()

    if (data.success) {
      setBusinesses(data.businesses)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const createBusiness = async () => {
    if (!form.name.trim()) {
      alert('Business name required')
      return
    }

    setLoading(true)

    const res = await fetch('/api/businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    setLoading(false)

    if (data.error) {
      alert(data.message)
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

    fetchBusinesses()

    alert('Business created successfully')
  }

  return (
    <main style={page}>
      <section style={hero}>
        <div>
          <p style={eyebrow}>AI Ordering SaaS</p>
          <h1 style={title}>Business Onboarding</h1>
          <p style={subtitle}>
            Create a new business, assign its type, and prepare it for WhatsApp AI ordering,
            menu import, payments and dashboard management.
          </p>
        </div>

        <div style={heroBadge}>
          <strong>Platform Mode</strong>
          <span>Multi-business ready</span>
        </div>
      </section>

      <section style={grid}>
        <div style={card}>
          <h2 style={cardTitle}>Create Business</h2>

          <label style={label}>Business name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Example: Richmond Coffee House"
            style={input}
          />

          <label style={label}>Business type</label>
          <select
            value={form.business_type}
            onChange={(e) =>
              setForm({ ...form, business_type: e.target.value })
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
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Business phone"
            style={input}
          />

          <label style={label}>WhatsApp number</label>
          <input
            value={form.whatsapp_number}
            onChange={(e) =>
              setForm({ ...form, whatsapp_number: e.target.value })
            }
            placeholder="WhatsApp number"
            style={input}
          />

          <label style={label}>Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Business email"
            style={input}
          />

          <label style={label}>Main branch address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            style={input}
          />

          <label style={label}>Postcode</label>
          <input
            value={form.postcode}
            onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            placeholder="Postcode"
            style={input}
          />

          <button onClick={createBusiness} disabled={loading} style={button}>
            {loading ? 'Creating...' : 'Create Business'}
          </button>
        </div>

        <div style={card}>
          <h2 style={cardTitle}>Existing Businesses</h2>

          {businesses.length === 0 ? (
            <p style={muted}>No businesses created yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {businesses.map((business) => (
                <div key={business.id} style={businessCard}>
                  <div>
                    <h3 style={{ margin: 0 }}>{business.name}</h3>
                    <p style={muted}>{business.slug}</p>
                    <p style={typeBadge}>{business.business_type}</p>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    <a
                      href={`/menu-import?business_id=${business.id}`}
                      style={smallButton}
                    >
                      Import Menu
                    </a>
                    <a
                      href={`/dashboard?business_id=${business.id}`}
                      style={smallButtonDark}
                    >
                      Dashboard
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 32,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const hero: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 24px',
  background: 'linear-gradient(135deg, #020617, #1e293b)',
  color: 'white',
  borderRadius: 24,
  padding: 32,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 20,
  alignItems: 'center',
}

const eyebrow: React.CSSProperties = {
  color: '#38bdf8',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 800,
  fontSize: 12,
  margin: 0,
}

const title: React.CSSProperties = {
  margin: '8px 0',
  fontSize: 42,
}

const subtitle: React.CSSProperties = {
  margin: 0,
  color: '#cbd5e1',
  maxWidth: 680,
  lineHeight: 1.5,
}

const heroBadge: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.16)',
  borderRadius: 18,
  padding: 18,
  display: 'grid',
  gap: 4,
  minWidth: 200,
}

const grid: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 460px) 1fr',
  gap: 20,
}

const card: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const cardTitle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 18,
}

const label: React.CSSProperties = {
  display: 'block',
  fontWeight: 800,
  fontSize: 13,
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

const button: React.CSSProperties = {
  marginTop: 18,
  width: '100%',
  padding: 14,
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 900,
  fontSize: 15,
}

const businessCard: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  padding: 18,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 15,
  alignItems: 'center',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0',
}

const typeBadge: React.CSSProperties = {
  display: 'inline-block',
  background: '#e0f2fe',
  color: '#075985',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 900,
  margin: '6px 0 0',
}

const smallButton: React.CSSProperties = {
  padding: '9px 12px',
  background: '#e0f2fe',
  color: '#075985',
  textDecoration: 'none',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 900,
  textAlign: 'center',
}

const smallButtonDark: React.CSSProperties = {
  ...smallButton,
  background: '#020617',
  color: 'white',
}