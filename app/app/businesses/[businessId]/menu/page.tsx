'use client'

import { useParams } from 'next/navigation'

export default function MenuPage() {
  const params = useParams<{ businessId: string }>()
  const businessId = encodeURIComponent(params.businessId)

  return (
    <section style={panel}>
      <p style={eyebrow}>Menu</p>
      <h1 style={title}>Menu Manager</h1>
      <p style={muted}>
        The canonical SaaS menu page will live here. For now, the existing menu
        manager remains available.
      </p>
      <a href={`/menu?business_id=${businessId}`} style={primaryButton}>
        Open Existing Menu Manager
      </a>
    </section>
  )
}

const panel: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 24,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
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
}

const primaryButton: React.CSSProperties = {
  display: 'inline-block',
  marginTop: 12,
  padding: '11px 14px',
  background: '#020617',
  color: 'white',
  textDecoration: 'none',
  borderRadius: 12,
  fontWeight: 900,
}
