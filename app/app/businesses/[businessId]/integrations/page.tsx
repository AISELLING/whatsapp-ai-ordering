'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatusBadge } from '@/components/tek9'
import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_DEFINITIONS,
  type IntegrationCategory,
} from '@/lib/integrations'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Integration = {
  id: string
  provider: string
  category?: string
  status: string
}

export default function IntegrationsPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyProvider, setBusyProvider] = useState('')

  const integrationMap = useMemo(
    () => new Map(integrations.map((integration) => [integration.provider, integration])),
    [integrations]
  )

  const groupedDefinitions = useMemo(() => {
    return INTEGRATION_CATEGORIES.map((category) => ({
      category,
      label: INTEGRATION_CATEGORY_LABELS[category],
      items: INTEGRATION_DEFINITIONS.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0)
  }, [])

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    setError('')

    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/businesses/${businessId}/integrations`, {
      cache: 'no-store',
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.success) {
      setIntegrations(data.integrations || [])
      setLoading(false)
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

    setError(data.message || 'Failed to load integrations')
    setLoading(false)
  }, [businessId, router])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  const connectIntegration = async (provider: string, category: IntegrationCategory) => {
    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setBusyProvider(provider)
    setError('')

    const res = await fetch(`/api/businesses/${businessId}/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        provider,
        category,
        status: 'pending',
        metadata: {
          source: 'manual_placeholder_connect',
          connected_at: new Date().toISOString(),
        },
      }),
    })
    const data = await res.json()
    setBusyProvider('')

    if (data.success && data.integration) {
      setIntegrations((current) => {
        const filtered = current.filter((item) => item.provider !== provider)
        return [...filtered, data.integration]
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

    setError(data.message || 'Failed to connect integration')
  }

  const disconnectIntegration = async (integration: Integration) => {
    const authHeaders = await getAuthHeaders()
    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setBusyProvider(integration.provider)
    setError('')

    const res = await fetch(
      `/api/businesses/${businessId}/integrations/${integration.id}`,
      {
        method: 'DELETE',
        headers: authHeaders,
      }
    )
    const data = await res.json()
    setBusyProvider('')

    if (data.success) {
      setIntegrations((current) =>
        current.filter((item) => item.id !== integration.id)
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

    setError(data.message || 'Failed to disconnect integration')
  }

  return (
    <>
      <section className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
          Workspace
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
          Integrations
        </h1>
        <p className="mt-2 text-slate-400">
          Integration marketplace foundation grouped by category.
        </p>
      </section>

      {loading && (
        <p className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-slate-300">
          Loading integrations...
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </p>
      )}

      <div className="grid gap-6">
        {groupedDefinitions.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 text-lg font-black text-white">{group.label}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((definition) => {
                const integration = integrationMap.get(definition.provider)
                const connected = Boolean(integration)
                const status = connected
                  ? integration?.status || 'connected'
                  : 'not connected'
                const busy = busyProvider === definition.provider

                return (
                  <GlowCard key={definition.provider} className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-black text-white">{definition.label}</h3>
                      <StatusBadge status={status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{definition.description}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {definition.support.replaceAll('_', ' ')}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {!connected ? (
                        <button
                          type="button"
                          onClick={() =>
                            connectIntegration(definition.provider, definition.category)
                          }
                          disabled={busy}
                          className="rounded-2xl bg-violet-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Connect
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => disconnectIntegration(integration!)}
                          disabled={busy}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  </GlowCard>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
