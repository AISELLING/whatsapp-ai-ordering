import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SHOPIFY_API_VERSION = '2026-04'

type RouteContext = {
  params: Promise<{
    businessId: string
  }>
}

type ShopifyProduct = {
  id: number | string
  title?: string
  body_html?: string
  product_type?: string
  status?: string
  variants?: ShopifyVariant[]
  images?: ShopifyImage[]
  image?: ShopifyImage | null
}

type ShopifyVariant = {
  id: number | string
  price?: string
  sku?: string
}

type ShopifyImage = {
  src?: string
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('shopify_shop_domain, shopify_admin_access_token')
      .eq('id', businessId)
      .single()

    if (businessError) {
      return NextResponse.json(
        { error: true, message: businessError.message },
        { status: 500 }
      )
    }

    const shopDomain = normalizeShopDomain(business.shopify_shop_domain || '')
    const accessToken = String(business.shopify_admin_access_token || '').trim()

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        {
          error: true,
          message: 'Connect Shopify before syncing products',
        },
        { status: 400 }
      )
    }

    if (!isAllowedShopifyDomain(shopDomain)) {
      return NextResponse.json(
        {
          error: true,
          message: 'Use a valid myshopify.com shop domain',
        },
        { status: 400 }
      )
    }

    const products = await fetchShopifyProducts(shopDomain, accessToken)
    const errors: string[] = []
    let imported = 0
    let updated = 0

    for (const product of products) {
      const firstVariant = product.variants?.[0]
      const shopifyVariantId = firstVariant?.id

      if (!product.id || !shopifyVariantId) {
        errors.push(
          `${product.title || 'Untitled product'} skipped: missing product or variant id`
        )
        continue
      }

      const payload = {
        business_id: businessId,
        name: product.title || 'Untitled Shopify Product',
        description: stripHtml(product.body_html || ''),
        category: product.product_type || '',
        price: Number(firstVariant.price || 0),
        sku: firstVariant.sku || '',
        shopify_product_id: String(product.id),
        shopify_variant_id: String(shopifyVariantId),
        image_url: product.images?.[0]?.src || product.image?.src || '',
        is_available: product.status === 'active',
      }

      const { data: existingProduct, error: lookupError } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('shopify_variant_id', payload.shopify_variant_id)
        .maybeSingle()

      if (lookupError) {
        errors.push(`${payload.name}: ${lookupError.message}`)
        continue
      }

      const result = existingProduct
        ? await supabaseAdmin
            .from('products')
            .update(payload)
            .eq('id', existingProduct.id)
            .eq('business_id', businessId)
        : await supabaseAdmin.from('products').insert(payload)

      if (result.error) {
        errors.push(`${payload.name}: ${result.error.message}`)
        continue
      }

      if (existingProduct) {
        updated += 1
      } else {
        imported += 1
      }
    }

    const lastSyncAt = new Date().toISOString()

    await supabaseAdmin
      .from('businesses')
      .update({
        shopify_connected: true,
        shopify_last_sync_at: lastSyncAt,
      })
      .eq('id', businessId)

    return NextResponse.json({
      success: true,
      imported,
      updated,
      errors,
      shopify_last_sync_at: lastSyncAt,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to sync Shopify products',
      },
      { status: 500 }
    )
  }
}

async function fetchShopifyProducts(shopDomain: string, accessToken: string) {
  const products: ShopifyProduct[] = []
  let nextUrl: string | null =
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`
  let pagesFetched = 0

  while (nextUrl && pagesFetched < 10) {
    const res = await fetch(nextUrl, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
    })

    const text = await res.text()
    const json = safeJson(text)

    if (!res.ok) {
      throw new Error(
        json?.errors ||
          json?.error ||
          `Shopify product fetch failed with status ${res.status}`
      )
    }

    products.push(...((json?.products || []) as ShopifyProduct[]))
    nextUrl = getNextPageUrl(res.headers.get('link'))
    pagesFetched += 1
  }

  return products
}

function getNextPageUrl(linkHeader: string | null) {
  if (!linkHeader) {
    return null
  }

  const nextLink = linkHeader
    .split(',')
    .map((part) => part.trim())
    .find((part) => part.includes('rel="next"'))

  if (!nextLink) {
    return null
  }

  const match = nextLink.match(/<([^>]+)>/)
  return match?.[1] || null
}

function normalizeShopDomain(value: string) {
  const trimmed = value.trim().toLowerCase()

  if (!trimmed) {
    return ''
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '')
  const host = withoutProtocol.split('/')[0].split('?')[0].trim()

  if (!host) {
    return ''
  }

  if (!host.includes('.')) {
    return `${host}.myshopify.com`
  }

  return host
}

function isAllowedShopifyDomain(shopDomain: string) {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
