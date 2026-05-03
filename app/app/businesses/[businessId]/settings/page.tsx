'use client'

import { useParams } from 'next/navigation'

export default function SettingsPage() {
  const params = useParams<{ businessId: string }>()

  return (
    <section style={panel}>
      <p style={eyebrow}>Settings</p>
      <h1 style={title}>Business Settings</h1>
      <p style={muted}>
        Settings for business <strong>{params.businessId}</strong> will be added
        here, including general details, WhatsApp setup, payments and team
        access.
      </p>
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
