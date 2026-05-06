import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SHOPIFY_API_VERSION = '2026-04'
const SHOPIFY_PAGE_LIMIT = 250
const MAX_WARNINGS_TO_STORE = 100

type RouteContext = {
  params: Promise<{
    businessId: string
    jobId: string
  }>
}

type ShopifyProduct = {
  id: number | string
  title?: string
  body_html?: string
  product_type?: string
  handle?: string
  vendor?: string
  status?: string
  tags?: string
  variants?: ShopifyVariant[]
  images?: ShopifyImage[]
  image?: ShopifyImage | null
}

type ShopifyVariant = {
  id: number | string
  title?: string
  price?: string
  sku?: string
  inventory_item_id?: number | string
  inventory_policy?: string
}

type ShopifyImage = {
  src?: string
}

type SyncJob = {
  id: string
  business_id: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  cursor?: string | null
  total_products?: number | null
  total_variants?: number | null
  processed_products?: number | null
  processed_variants?: number | null
  imported_count?: number | null
  updated_count?: number | null
  skipped_count?: number | null
  failed_count?: number | null
  warning_count?: number | null
  warnings?: string[] | null
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { businessId, jobId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('business_id', businessId)
      .single<SyncJob>()

    if (jobError || !job) {
      return NextResponse.json(
        { error: true, message: jobError?.message || 'Sync job not found' },
        { status: 404 }
      )
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        job,
        done: true,
      })
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('shopify_shop_domain, shopify_admin_access_token')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      await failJob(jobId, businessError?.message || 'Business not found')
      return NextResponse.json(
        { error: true, message: businessError?.message || 'Business not found' },
        { status: 500 }
      )
    }

    const shopDomain = normalizeShopDomain(business.shopify_shop_domain || '')
    const accessToken = String(business.shopify_admin_access_token || '').trim()

    if (!shopDomain || !accessToken) {
      await failJob(jobId, 'Connect Shopify before syncing products')
      return NextResponse.json(
        { error: true, message: 'Connect Shopify before syncing products' },
        { status: 400 }
      )
    }

    if (!isAllowedShopifyDomain(shopDomain)) {
      await failJob(jobId, 'Use a valid myshopify.com shop domain')
      return NextResponse.json(
        { error: true, message: 'Use a valid myshopify.com shop domain' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    if (job.status === 'queued') {
      await updateJob(jobId, {
        status: 'running',
        started_at: now,
        updated_at: now,
      })
    }

    const totalProducts =
      Number(job.total_products || 0) > 0
        ? Number(job.total_products || 0)
        : await fetchShopifyProductCount(shopDomain, accessToken)

    const nextUrl =
      job.cursor ||
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${SHOPIFY_PAGE_LIMIT}`

    const page = await fetchShopifyProductPage(nextUrl, accessToken)
    const products = page.products
    const nextCursor = page.nextUrl

    let processedProducts = Number(job.processed_products || 0)
    let processedVariants = Number(job.processed_variants || 0)
    let totalVariants = Number(job.total_variants || 0)
    let imported = Number(job.imported_count || 0)
    let updated = Number(job.updated_count || 0)
    let skipped = Number(job.skipped_count || 0)
    let failed = Number(job.failed_count || 0)
    const warnings = [...(job.warnings || [])]

    for (const product of products) {
      processedProducts += 1

      const variants = product.variants || []
      totalVariants += variants.length

      if (!product.id || variants.length === 0) {
        skipped += 1
        pushWarning(
          warnings,
          `${product.title || 'Untitled product'} skipped: no variants`
        )
        continue
      }

      for (const variant of variants) {
        processedVariants += 1

        if (!variant.id) {
          skipped += 1
          pushWarning(
            warnings,
            `${product.title || 'Untitled product'} skipped: variant missing id`
          )
          continue
        }

        const payload = buildProductPayload({
          businessId,
          product,
          variant,
        })

        const { data: existingProduct, error: lookupError } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('business_id', businessId)
          .eq('shopify_variant_id', payload.shopify_variant_id)
          .maybeSingle()

        if (lookupError) {
          failed += 1
          pushWarning(warnings, `${payload.name}: ${lookupError.message}`)
          continue
        }

        const upsertResult = await supabaseAdmin
          .from('products')
          .upsert(payload, { onConflict: 'business_id,shopify_variant_id' })

        if (upsertResult.error) {
          failed += 1
          pushWarning(warnings, `${payload.name}: ${upsertResult.error.message}`)
          continue
        }

        if (existingProduct) {
          updated += 1
        } else {
          imported += 1
        }
      }
    }

    const updatePayload: Record<string, any> = {
      status: nextCursor ? 'running' : 'completed',
      cursor: nextCursor,
      total_products: totalProducts,
      total_variants: totalVariants,
      processed_products: processedProducts,
      processed_variants: processedVariants,
      imported_count: imported,
      updated_count: updated,
      skipped_count: skipped,
      failed_count: failed,
      warning_count: warnings.length,
      warnings,
      updated_at: new Date().toISOString(),
    }

    if (!nextCursor) {
      const completedAt = new Date().toISOString()
      updatePayload.completed_at = completedAt
      await supabaseAdmin
        .from('businesses')
        .update({
          shopify_connected: true,
          shopify_last_sync_at: completedAt,
        })
        .eq('id', businessId)
    }

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .update(updatePayload)
      .eq('id', jobId)
      .select('*')
      .single()

    if (updateError) {
      await failJob(jobId, updateError.message)
      return NextResponse.json(
        { error: true, message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
      done: updatedJob.status === 'completed',
    })
  } catch (error: any) {
    const message = error.message || 'Failed to process sync chunk'
    const { jobId } = await context.params
    await failJob(jobId, message)
    return NextResponse.json(
      { error: true, message },
      { status: 500 }
    )
  }
}

async function fetchShopifyProductCount(
  shopDomain: string,
  accessToken: string
) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products/count.json`,
    {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
    }
  )

  if (!res.ok) {
    return 0
  }

  const json = await res.json().catch(() => null)
  return Number(json?.count || 0)
}

async function fetchShopifyProductPage(url: string, accessToken: string) {
  const res = await fetch(url, {
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

  return {
    products: (json?.products || []) as ShopifyProduct[],
    nextUrl: getNextPageUrl(res.headers.get('link')),
  }
}

function buildProductPayload({
  businessId,
  product,
  variant,
}: {
  businessId: string
  product: ShopifyProduct
  variant: ShopifyVariant
}) {
  const variantTitle = variant.title || ''
  const isDefaultVariant = !variantTitle || variantTitle === 'Default Title'
  const productTitle = product.title || 'Untitled Shopify Product'
  const syncedAt = new Date().toISOString()

  return {
    business_id: businessId,
    source: 'shopify',
    name: isDefaultVariant ? productTitle : `${productTitle} - ${variantTitle}`,
    description: stripHtml(product.body_html || ''),
    category: product.product_type || '',
    price: Number(variant.price || 0),
    sku: variant.sku || '',
    shopify_product_id: String(product.id),
    shopify_variant_id: String(variant.id),
    shopify_inventory_item_id: variant.inventory_item_id
      ? String(variant.inventory_item_id)
      : '',
    shopify_product_title: productTitle,
    shopify_variant_title: variantTitle,
    shopify_handle: product.handle || '',
    shopify_vendor: product.vendor || '',
    shopify_product_type: product.product_type || '',
    shopify_status: product.status || '',
    shopify_tags: product.tags || '',
    image_url: product.images?.[0]?.src || product.image?.src || '',
    inventory_policy: variant.inventory_policy || '',
    is_available: product.status === 'active',
    shopify_synced_at: syncedAt,
    shopify_last_seen_at: syncedAt,
    sync_hash: createSyncHash({
      title: productTitle,
      variantTitle,
      description: product.body_html || '',
      productType: product.product_type || '',
      price: variant.price || '',
      sku: variant.sku || '',
      status: product.status || '',
      image: product.images?.[0]?.src || product.image?.src || '',
    }),
  }
}

async function updateJob(jobId: string, updates: Record<string, any>) {
  const { error } = await supabaseAdmin
    .from('shopify_sync_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    throw error
  }
}

async function failJob(jobId: string, message: string) {
  const failedAt = new Date().toISOString()
  await supabaseAdmin
    .from('shopify_sync_jobs')
    .update({
      status: 'failed',
      error_message: message,
      completed_at: failedAt,
      updated_at: failedAt,
    })
    .eq('id', jobId)
}

function pushWarning(warnings: string[], warning: string) {
  if (warnings.length < MAX_WARNINGS_TO_STORE) {
    warnings.push(warning)
  }
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

function createSyncHash(value: Record<string, string>) {
  return JSON.stringify(value)
}

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
