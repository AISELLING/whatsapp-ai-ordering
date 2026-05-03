'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function DashboardRedirect() {
  const router = useRouter()
  const params = useSearchParams()
  const businessId = params.get('business_id')

  useEffect(() => {
    if (businessId) {
      router.replace(
        `/app/businesses/${encodeURIComponent(businessId)}/dashboard`
      )
      return
    }

    router.replace('/app/businesses')
  }, [businessId, router])

  return <p style={{ padding: 30 }}>Redirecting to dashboard...</p>
}

export default function Dashboard() {
  return (
    <Suspense fallback={<p style={{ padding: 30 }}>Loading dashboard...</p>}>
      <DashboardRedirect />
    </Suspense>
  )
}
