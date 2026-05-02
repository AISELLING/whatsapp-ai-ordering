'use client'

import { useState } from 'react'

export default function MenuImportPage() {
  const [menuText, setMenuText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const importMenu = async () => {
    if (!menuText.trim()) {
      alert('Paste a menu first')
      return
    }

    setLoading(true)
    setResult(null)

    const res = await fetch('/api/menu-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menuText }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)

    if (data.error) {
      alert(data.message || 'Import failed')
    }
  }

  return (
    <main style={{ padding: 40, fontFamily: 'Arial', maxWidth: 900 }}>
      <h1>AI Menu Import</h1>

      <p>
        Paste a full restaurant menu below. The AI will extract products,
        prices and categories automatically.
      </p>

      <p>
        <a href="/">Order Page</a> | <a href="/menu">Menu Manager</a> |{' '}
        <a href="/dashboard">Dashboard</a>
      </p>

      <textarea
        value={menuText}
        onChange={(e) => setMenuText(e.target.value)}
        placeholder={`Example:

Burgers
Classic Burger £5.99
Cheese Burger £6.49
Chicken Burger £6.99

Sides
Chips £2.50
Onion Rings £3.00

Drinks
Coke £1.50
Fanta £1.50`}
        style={{
          width: '100%',
          height: 300,
          padding: 15,
          fontSize: 16,
          marginTop: 20,
        }}
      />

      <br />
      <br />

      <button
        onClick={importMenu}
        disabled={loading}
        style={{
          padding: '14px 25px',
          background: 'black',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        {loading ? 'Importing Menu...' : 'Import Menu with AI'}
      </button>

      {result && (
        <div
          style={{
            marginTop: 30,
            padding: 20,
            border: '1px solid #ddd',
            borderRadius: 10,
            background: result.error ? '#ffe8e8' : '#e8ffe8',
          }}
        >
          <h2>{result.error ? 'Import Failed' : 'Import Complete ✅'}</h2>
          <p>{result.message}</p>

          {result.products?.length > 0 && (
            <>
              <h3>Imported Products</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {result.products.map((product: any) => (
                  <div
                    key={product.id}
                    style={{
                      padding: 10,
                      border: '1px solid #ccc',
                      borderRadius: 6,
                      background: 'white',
                    }}
                  >
                    <strong>{product.name}</strong> — £
                    {Number(product.price).toFixed(2)}
                    <br />
                    <small>{product.category}</small>
                    <p>{product.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}