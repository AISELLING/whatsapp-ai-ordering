'use client'

import { useState } from 'react'

export default function Home() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [savedOrder, setSavedOrder] = useState<any>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setSavedOrder(null)

    const res = await fetch('/api/parse-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })

    const data = await res.json()
    setResponse({
      ...data,
      customer_message: message,
    })

    setLoading(false)
  }

  const saveOrder = async () => {
    setSaving(true)

    const res = await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    })

    const data = await res.json()
    setSavedOrder(data)
    setSaving(false)

    if (data.error) {
      alert(data.message || 'Failed to save order')
    } else {
      alert('Order saved to Supabase')
    }
  }

  const payNow = async () => {
    setPaymentLoading(true)

    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    })

    const data = await res.json()

    if (data.checkout_url) {
      window.location.href = data.checkout_url
    } else {
      alert(data.message || 'Payment failed')
      setPaymentLoading(false)
    }
  }

  return (
    <main style={{ padding: 40, fontFamily: 'Arial', maxWidth: 700 }}>
      <h1>WhatsApp AI Order Assistant</h1>
      <p>Test your customer order below:</p>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type order..."
        style={{ padding: 10, width: 400, fontSize: 16 }}
      />

      <br />
      <br />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Processing...' : 'Send Message'}
      </button>

      {response && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: '1px solid #ccc',
            borderRadius: 10,
            maxWidth: 500,
          }}
        >
          <h3>AI Reply</h3>
          <p>{response.reply}</p>

          <h4>Order Summary</h4>

          {response.items?.map((item: any, i: number) => (
            <div key={i}>
              {item.quantity} x {item.name} — £
              {Number(item.line_total || 0).toFixed(2)}
            </div>
          ))}

          <p>
            <strong>Order type:</strong> {response.order_type || 'Not selected'}
          </p>

          <p>
            <strong>Subtotal:</strong> £
            {Number(response.subtotal || 0).toFixed(2)}
          </p>

          <button
            onClick={saveOrder}
            disabled={saving}
            style={{
              marginTop: 20,
              marginRight: 10,
              padding: '12px 25px',
              background: 'black',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {saving ? 'Saving...' : 'Save Order'}
          </button>

          <button
            onClick={payNow}
            disabled={paymentLoading}
            style={{
              marginTop: 20,
              padding: '12px 25px',
              background: 'green',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            {paymentLoading ? 'Creating Payment...' : 'Pay Now'}
          </button>

          {savedOrder && (
            <div style={{ marginTop: 20, background: '#e8ffe8', padding: 15 }}>
              <strong>{savedOrder.message}</strong>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

