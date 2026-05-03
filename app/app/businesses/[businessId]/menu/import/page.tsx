'use client'

import { useParams } from 'next/navigation'
import { GlowCard } from '@/components/tek9'

export default function MenuImportPage() {
  const params = useParams<{ businessId: string }>()
  const businessId = encodeURIComponent(params.businessId)

  return (
    <GlowCard className="p-6">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
        Menu Import
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
        Import Menu
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-400">
        The canonical SaaS menu import flow will live here. For now, the
        existing importer remains available and keeps the secured API flow
        intact.
      </p>
      <a
        href={`/menu-import?business_id=${businessId}`}
        className="mt-6 inline-flex rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300"
      >
        Open Existing Menu Import
      </a>
    </GlowCard>
  )
}
