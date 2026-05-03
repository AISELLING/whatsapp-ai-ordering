'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { GlowCard, StatusBadge } from '@/components/tek9'
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
        current.map((item) => (item.id === product.id ? data.product : item))
      )
      return
    }

    setError(data.message || 'Failed to update availability')
  }

  return (
    <>
      <section className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
            Product system
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
            Menu
          </h1>
          <p className="mt-2 text-slate-400">
            Manage products available to your AI ordering flow.
          </p>
        </div>
        <StatusBadge status={`${products.length} products`} />
      </section>

      {message && (
        <p className="mb-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-emerald-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
          {error}
        </p>
      )}

      <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <GlowCard className="p-5">
          <h2 className="text-2xl font-black text-white">
            {form.id ? 'Edit Product' : 'Add Product'}
          </h2>
          <form onSubmit={saveProduct} className="mt-5 grid gap-4">
            <Field label="Name">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className={inputClass}
                required
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className={`${inputClass} min-h-28 resize-y`}
              />
            </Field>

            <Field label="Category">
              <input
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Price">
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                className={inputClass}
                required
              />
            </Field>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-200">
              Available
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) =>
                  setForm({ ...form, is_available: event.target.checked })
                }
                className="h-5 w-5 accent-violet-400"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Add Product'}
              </button>
              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </GlowCard>

        <GlowCard className="p-5">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Products</h2>
              <p className="mt-1 text-sm text-slate-400">
                {products.length} products loaded
              </p>
            </div>
          </div>

          {loading && <p className="text-slate-400">Loading products...</p>}

          {!loading && products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-black text-white">No products yet</h3>
              <p className="mt-2 text-slate-400">
                Add your first product to start building a menu.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:bg-white/[0.06]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-100">
                        {product.category || 'Uncategorised'}
                      </span>
                      <h3 className="mt-3 text-xl font-black text-white">
                        {product.name}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        {product.description || 'No description'}
                      </p>
                      <strong className="mt-3 block text-lg text-white">
                        £{Number(product.price || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => toggleAvailability(product)}
                        disabled={updatingId === product.id}
                        className={`rounded-2xl border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          product.is_available === false
                            ? 'border-white/10 bg-white/[0.04] text-slate-400'
                            : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                        }`}
                      >
                        {product.is_available === false
                          ? 'Unavailable'
                          : 'Available'}
                      </button>
                      <button
                        type="button"
                        onClick={() => editProduct(product)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        disabled={updatingId === product.id}
                        className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm font-black text-rose-100 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GlowCard>
      </section>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-200">
      {label}
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-300/50'
