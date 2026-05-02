'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState('Updating order...')

  useEffect(() => {
    const markPaid = async () => {
      if (!sessionId) {
        setStatus('Missing payment session.')
        return
      }

      const res = await fetch('/api/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('Order paid and saved successfully ✅')
      } else {
        setStatus(data.message || 'Payment confirmed, but order update failed.')
      }
    }

    markPaid()
  }, [sessionId])

  return (
    <main style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Payment Successful ✅</h1>
      <p>{status}</p>
      <a href="/">← Back to order page</a>
    </main>
  )
}