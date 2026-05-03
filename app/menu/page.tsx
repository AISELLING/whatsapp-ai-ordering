'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

function MenuContent() {
  const params = useSearchParams()
  const businessId = params.get('business_id')

  const [products, setProducts] = useState<any[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  })

  const fetchProducts = async () => {
    if (!businessId) {
      setError('business_id required')
      return
    }

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      setError('Please sign in to manage this menu.')
      return
    }

    const res = await fetch(`/api/products?business_id=${businessId}`, {
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.error) {
      setError(data.message || 'Failed to load products')
      return
    }

    setProducts(data.products || [])
    setError('')
  }

  const addProduct = async () => {
    if (!businessId) {
      alert('business_id required')
      return
    }

    if (!form.name || !form.price) {
      alert('Name and price required')
      return
    }

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      alert('Please sign in to manage this menu.')
      return
    }

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        ...form,
        business_id: businessId,
      }),
    })

    const data = await res.json()

    if (data.error) {
      alert(data.message)
      return
    }

    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
    })

    fetchProducts()
  }

  const deleteProduct = async (id: string) => {
    if (!businessId) {
      alert('business_id required')
      return
    }

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      alert('Please sign in to manage this menu.')
      return
    }

    await fetch('/api/products/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        id,
        business_id: businessId,
      }),
    })

    fetchProducts()
  }

  useEffect(() => {
    fetchProducts()
  }, [businessId])

  return (
    <main style={{ padding: 40, fontFamily: 'Arial', maxWidth: 800 }}>
      <h1>Menu Manager</h1>
      <p>Add products that your AI assistant can sell.</p>

      <a href="/">← Order page</a> |{' '}
      <a href={`/dashboard?business_id=${businessId || ''}`}>Dashboard</a>

      <p><strong>Business ID:</strong> {businessId}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div
        style={{
          marginTop: 30,
          padding: 20,
          border: '1px solid #ddd',
          borderRadius: 10,
          background: '#f9f9f9',
        }}
      >
        <h2>Add Product</h2>

        <input
          placeholder="Product name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
        />

        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
        />

        <input
          placeholder="Price"
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
        />

        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          style={{ display: 'block', marginBottom: 10, padding: 10, width: '100%' }}
        />

        <button
          onClick={addProduct}
          style={{
            padding: '12px 20px',
            background: 'black',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Add Product
        </button>
      </div>

      <h2 style={{ marginTop: 30 }}>Current Menu</h2>

      {products.length === 0 && <p>No products yet.</p>}

      <div style={{ display: 'grid', gap: 15 }}>
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              padding: 15,
              border: '1px solid #ddd',
              borderRadius: 8,
            }}
          >
            <strong>{product.name}</strong> — £{Number(product.price).toFixed(2)}
            <p>{product.description}</p>
            <p>
              <strong>Category:</strong> {product.category || 'None'}
            </p>

            <button
              onClick={() => deleteProduct(product.id)}
              style={{
                padding: '8px 12px',
                background: 'red',
                color: 'white',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<p style={{ padding: 40 }}>Loading menu...</p>}>
      <MenuContent />
    </Suspense>
  )
}
