'use client'

import { useRouter } from 'next/navigation'
import { Tek9Logo } from '@/components/tek9'
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
    <header className="mx-auto mb-6 flex w-full max-w-7xl flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-white backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Tek9Logo />
        {title && (
          <h1 className="mt-5 text-3xl font-black tracking-tight">{title}</h1>
        )}
      </div>

      <nav className="flex flex-wrap gap-3">
        <a
          href="/app/account"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
        >
          Account
        </a>
        <button
          onClick={logout}
          className="rounded-2xl bg-violet-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
        >
          Logout
        </button>
      </nav>
    </header>
  )
}
