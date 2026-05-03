'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type SaasAppHeaderProps = {
  title?: string
}

export default function SaasAppHeader({ title }: SaasAppHeaderProps) {
  const router = useRouter()

  const logout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header style={header}>
      <div>
        <p style={eyebrow}>WhatsApp AI Ordering SaaS</p>
        <h1 style={titleStyle}>{title || 'Businesses'}</h1>
      </div>

      <nav style={nav}>
        <a href="#" style={navLink}>Account</a>
        <button onClick={logout} style={logoutButton}>Logout</button>
      </nav>
    </header>
  )
}

const header: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto 24px',
  background: 'linear-gradient(135deg, #020617, #1e293b)',
  color: 'white',
  borderRadius: 24,
  padding: 28,
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

const titleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 36,
}

const nav: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

const navLink: React.CSSProperties = {
  color: '#e0f2fe',
  textDecoration: 'none',
  fontWeight: 800,
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
}

const logoutButton: React.CSSProperties = {
  ...navLink,
  background: 'white',
  color: '#020617',
  cursor: 'pointer',
}
