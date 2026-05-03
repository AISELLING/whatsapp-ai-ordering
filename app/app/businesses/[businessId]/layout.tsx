'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { Tek9Logo } from '@/components/tek9'
import { getAuthHeaders, getSupabaseBrowserClient } from '@/lib/supabaseBrowser'

type Business = {
  id: string
  name: string
  slug?: string
  business_type?: string
}

const navigation = [
  ['Dashboard', 'dashboard'],
  ['Orders', 'orders'],
  ['Menu', 'menu'],
  ['Import Menu', 'menu/import'],
  ['AI Settings', 'ai-settings'],
  ['Settings', 'settings'],
]

export default function BusinessWorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams<{ businessId: string }>()
  const pathname = usePathname()
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
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B0F1A] p-6 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-8 text-slate-300">
          Loading workspace...
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B0F1A] p-6 text-white">
        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-8 text-rose-100">
          {error}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(168,85,247,0.18),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#0B0F1A,#070A12)]" />
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-white/10 bg-black/20 p-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col gap-6">
            <Tek9Logo />
            <nav className="grid gap-2">
              {navigation.map(([label, href]) => {
                const target = `/app/businesses/${encodedBusinessId}/${href}`
                const active = pathname === target

                return (
                  <a
                    key={href}
                    href={target}
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                      active
                        ? 'border-violet-300/30 bg-violet-400/15 text-white shadow-[0_0_26px_rgba(168,85,247,0.18)]'
                        : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {label}
                  </a>
                )
              })}
            </nav>
            <a
              href="/app/businesses"
              className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-black text-slate-200 transition hover:bg-white/10"
            >
              All Businesses
            </a>
          </div>
        </aside>

        <section className="min-w-0 p-5 sm:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-400">
                Current business
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                {business?.name}
              </h2>
            </div>
            <button
              onClick={logout}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </header>

          {children}
        </section>
      </div>
    </main>
  )
}
