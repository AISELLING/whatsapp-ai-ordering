'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/supabaseBrowser'

type Product = {
  id: string
  name: string
  description?: string
  category?: string
  price: number | string
  is_available?: boolean
}

type ProductForm = {
  id: string
  name: string
  description: string
  category: string
  price: string
  is_available: boolean
}

const emptyForm: ProductForm = {
  id: '',
  name: '',
  description: '',
  category: '',
  price: '',
  is_available: true,
}

export default function MenuPage() {
  const params = useParams<{ businessId: string }>()
  const router = useRouter()
  const businessId = params.businessId

  const [products, setProducts] = useState<Product[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadProducts = async () => {
    setLoading(true)
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/products?business_id=${businessId}`, {
      cache: 'no-store',
      headers: authHeaders,
    })
    const data = await res.json()

    if (data.success) {
      setProducts(data.products || [])
    } else if (res.status === 401) {
      router.replace('/login')
      return
    } else if (res.status === 403) {
      router.replace('/app/businesses')
      return
    } else {
      setError(data.message || 'Failed to load products')
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [businessId])

  const editProduct = (product: Product) => {
    setForm({
      id: product.id,
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: String(product.price ?? ''),
      is_available: product.is_available !== false,
    })
    setMessage('')
    setError('')
  }

  const resetForm = () => {
    setForm(emptyForm)
    setMessage('')
    setError('')
  }

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    const res = await fetch('/api/products', {
      method: form.id ? 'PUT' : 'POST',
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

    setSaving(false)

    if (data.success) {
      setMessage(form.id ? 'Product updated.' : 'Product added.')
      setForm(emptyForm)
      loadProducts()
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

    setError(data.message || 'Failed to save product')
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return

    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setUpdatingId(id)

    const res = await fetch('/api/products/delete', {
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
    const data = await res.json()

    setUpdatingId('')

    if (data.success) {
      setProducts((current) => current.filter((product) => product.id !== id))
      return
    }

    setError(data.message || 'Failed to delete product')
  }

  const toggleAvailability = async (product: Product) => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) {
      router.replace('/login')
      return
    }

    setUpdatingId(product.id)

    const res = await fetch('/api/products', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        id: product.id,
        business_id: businessId,
        name: product.name,
        description: product.description || '',
        category: product.category || '',
        price: product.price,
        is_available: product.is_available === false,
      }),
    })
    const data = await res.json()

    setUpdatingId('')

    if (data.success) {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? data.product : item
        )
      )
      return
    }

    setError(data.message || 'Failed to update availability')
  }

  return (
    <>
      <section style={toolbar}>
        <div>
          <h1 style={pageTitle}>Menu</h1>
          <p style={muted}>Manage products available to your AI ordering flow.</p>
        </div>
      </section>

      {message && <p style={successText}>{message}</p>}
      {error && <p style={errorText}>{error}</p>}

      <section style={layout}>
        <form onSubmit={saveProduct} style={panel}>
          <h2 style={panelTitle}>{form.id ? 'Edit Product' : 'Add Product'}</h2>

          <label style={label}>Name</label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            style={input}
            required
          />

          <label style={label}>Description</label>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            style={textarea}
            rows={4}
          />

          <label style={label}>Category</label>
          <input
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            style={input}
          />

          <label style={label}>Price</label>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm({ ...form, price: event.target.value })}
            style={input}
            required
          />

          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm({ ...form, is_available: event.target.checked })
              }
            />
            Available
          </label>

          <div style={formActions}>
            <button type="submit" disabled={saving} style={primaryButton}>
              {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add Product'}
            </button>
            {form.id && (
              <button type="button" onClick={resetForm} style={secondaryButton}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <section style={panel}>
          <div style={sectionHeader}>
            <div>
              <h2 style={panelTitle}>Products</h2>
              <p style={muted}>{products.length} products loaded</p>
            </div>
          </div>

          {loading && <p style={muted}>Loading products...</p>}

          {!loading && products.length === 0 ? (
            <div style={emptyState}>
              <h3 style={{ marginTop: 0 }}>No products yet</h3>
              <p style={muted}>Add your first product to start building a menu.</p>
            </div>
          ) : (
            <div style={productList}>
              {products.map((product) => (
                <article key={product.id} style={productCard}>
                  <div>
                    <p style={categoryBadge}>{product.category || 'Uncategorised'}</p>
                    <h3 style={productName}>{product.name}</h3>
                    <p style={muted}>{product.description || 'No description'}</p>
                    <strong>£{Number(product.price || 0).toFixed(2)}</strong>
                  </div>

                  <div style={productActions}>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(product)}
                      disabled={updatingId === product.id}
                      style={{
                        ...availabilityButton,
                        ...(product.is_available === false
                          ? unavailableButton
                          : availableButton),
                      }}
                    >
                      {product.is_available === false ? 'Unavailable' : 'Available'}
                    </button>
                    <button
                      type="button"
                      onClick={() => editProduct(product)}
                      style={secondaryButton}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(product.id)}
                      disabled={updatingId === product.id}
                      style={dangerButton}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  )
}

const toolbar: React.CSSProperties = {
  marginBottom: 20,
}

const pageTitle: React.CSSProperties = {
  margin: 0,
  color: '#020617',
}

const muted: React.CSSProperties = {
  color: '#64748b',
  margin: '5px 0',
  lineHeight: 1.5,
}

const layout: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '360px 1fr',
  gap: 18,
  alignItems: 'start',
}

const panel: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e2e8f0',
  borderRadius: 22,
  padding: 22,
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.06)',
}

const panelTitle: React.CSSProperties = {
  color: '#020617',
  marginTop: 0,
}

const label: React.CSSProperties = {
  display: 'block',
  fontWeight: 800,
  fontSize: 13,
  color: '#0f172a',
  marginBottom: 6,
  marginTop: 12,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  fontSize: 15,
  boxSizing: 'border-box',
}

const textarea: React.CSSProperties = {
  ...input,
  resize: 'vertical',
}

const checkboxLabel: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  fontWeight: 800,
  color: '#0f172a',
  marginTop: 14,
}

const formActions: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 16,
}

const primaryButton: React.CSSProperties = {
  padding: '10px 13px',
  background: '#020617',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 900,
}

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#e0f2fe',
  color: '#075985',
}

const dangerButton: React.CSSProperties = {
  ...primaryButton,
  background: '#fee2e2',
  color: '#991b1b',
}

const successText: React.CSSProperties = {
  color: '#166534',
  background: '#dcfce7',
  border: '1px solid #bbf7d0',
  borderRadius: 12,
  padding: 12,
}

const errorText: React.CSSProperties = {
  color: '#991b1b',
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: 12,
  padding: 12,
}

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 16,
}

const emptyState: React.CSSProperties = {
  border: '1px dashed #cbd5e1',
  borderRadius: 18,
  padding: 20,
  background: '#f8fafc',
}

const productList: React.CSSProperties = {
  display: 'grid',
  gap: 12,
}

const productCard: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  padding: 16,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'center',
}

const categoryBadge: React.CSSProperties = {
  display: 'inline-block',
  background: '#e0f2fe',
  color: '#075985',
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 12,
  fontWeight: 900,
  margin: 0,
}

const productName: React.CSSProperties = {
  margin: '8px 0',
  color: '#020617',
}

const productActions: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
}

const availabilityButton: React.CSSProperties = {
  padding: '10px 13px',
  border: 'none',
  borderRadius: 12,
  cursor: 'pointer',
  fontWeight: 900,
}

const availableButton: React.CSSProperties = {
  background: '#dcfce7',
  color: '#166534',
}

const unavailableButton: React.CSSProperties = {
  background: '#f1f5f9',
  color: '#64748b',
}
