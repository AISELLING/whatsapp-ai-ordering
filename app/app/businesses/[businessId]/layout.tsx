'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthHeaders, getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug?: string
  business_type?: string
}

export default function BusinessWorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadBusinessContext = async () => {
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

      if (!data.success) {
        if (res.status === 401) {
          router.replace('/login')
          return
        }

        setError(data.message || 'Failed to load business')
        setLoading(false)
        return
      }

      const businesses = (data.businesses || []) as Business[]
      const currentBusiness =
        businesses.find((item) => item.id === businessId) || null

      if (!currentBusiness) {
        router.replace('/app/businesses')
        return
      }

      setBusiness(currentBusiness)
      setLoading(false)
    }

    loadBusinessContext()
  }, [businessId, router])

  const logout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const encodedBusinessId = encodeURIComponent(businessId)

  if (loading) {
    return <main style={loadingPage}>Loading workspace...</main>
  }

  if (error) {
    return <main style={loadingPage}>{error}</main>
  }

  return (
    <main style={shell}>
      <aside style={sidebar}>
        <div>
          <p style={eyebrow}>WhatsApp AI</p>
          <h1 style={brand}>Ordering SaaS</h1>
        </div>

        <nav style={nav}>
          <a
            href={`/app/businesses/${encodedBusinessId}/dashboard`}
            style={navLink}
          >
            Dashboard
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/orders`}
            style={navLink}
          >
            Orders
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/menu`}
            style={navLink}
          >
            Menu
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/menu/import`}
            style={navLink}
          >
            Import Menu
          </a>
          <a
            href={`/app/businesses/${encodedBusinessId}/settings`}
            style={navLink}
          >
            Settings
          </a>
        </nav>

        <a href="/app/businesses" style={backLink}>
          All Businesses
        </a>
      </aside>

      <section style={workspace}>
        <header style={header}>
          <div>
            <p style={muted}>Current business</p>
            <h2 style={businessName}>{business?.name}</h2>
          </div>

          <button onClick={logout} style={logoutButton}>
            Logout
          </button>
        </header>

        {children}
      </section>
    </main>
  )
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  display: 'grid',
  gridTemplateColumns: '280px 1fr',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}

const sidebar: React.CSSProperties = {
  background: 'linear-gradient(180deg, #020617, #1e293b)',
  color: 'white',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
}

const eyebrow: React.CSSProperties = {
  color: '#38bdf8',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 900,
  fontSize: 12,
  margin: 0,
}

const brand: React.CSSProperties = {
  margin: '6px 0 0',
  fontSize: 24,
}

const nav: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}

const navLink: React.CSSProperties = {
  color: '#e0f2fe',
  textDecoration: 'none',
  fontWeight: 800,
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
}

const backLink: React.CSSProperties = {
  ...navLink,
  marginTop: 'auto',
  textAlign: 'center',
  background: 'white',
  color: '#020617',
}

const workspace: React.CSSProperties = {
  padding: 28,
}

const header: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 22,
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: 0,
  lineHeight: 1.5,
}

const businessName: React.CSSProperties = {
  margin: '4px 0 0',
  color: '#020617',
}

const logoutButton: React.CSSProperties = {
  padding: '11px 14px',
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 900,
}

const loadingPage: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: 32,
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Arial',
}
