import { after, NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SHOPIFY_API_VERSION = '2026-04'
const SHOPIFY_PAGE_LIMIT = 250
const MAX_WARNINGS_TO_STORE = 100

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
  status: string
  imported_count: number
  updated_count: number
  skipped_count: number
  failed_count: number
  warning_count: number
  warnings: string[]
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { data: activeJob, error: activeJobError } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeJobError) {
      return NextResponse.json(
        { error: true, message: activeJobError.message },
        { status: 500 }
      )
    }

    if (activeJob) {
      return NextResponse.json({
        success: true,
        job: activeJob,
        already_running: true,
      })
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
        { error: true, message: 'Connect Shopify before syncing products' },
        { status: 400 }
      )
    }

    if (!isAllowedShopifyDomain(shopDomain)) {
      return NextResponse.json(
        { error: true, message: 'Use a valid myshopify.com shop domain' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const { data: job, error: jobError } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .insert({
        business_id: businessId,
        requested_by: access.user.id,
        status: 'queued',
        sync_type: 'products',
        warnings: [],
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json(
        { error: true, message: jobError.message },
        { status: 500 }
      )
    }

    after(async () => {
      await runShopifyProductSync({
        jobId: job.id,
        businessId,
        shopDomain,
        accessToken,
      })
    })

    return NextResponse.json({
      success: true,
      job,
      already_running: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to start Shopify product sync',
      },
      { status: 500 }
    )
  }
}

async function runShopifyProductSync({
  jobId,
  businessId,
  shopDomain,
  accessToken,
}: {
  jobId: string
  businessId: string
  shopDomain: string
  accessToken: string
}) {
  const startedAt = new Date().toISOString()

  try {
    await updateJob(jobId, {
      status: 'running',
      started_at: startedAt,
      updated_at: startedAt,
    })

    const totalProducts = await fetchShopifyProductCount(shopDomain, accessToken)
    await updateJob(jobId, {
      total_products: totalProducts,
      updated_at: new Date().toISOString(),
    })

    let nextUrl: string | null =
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${SHOPIFY_PAGE_LIMIT}`
    const warnings: string[] = []
    let imported = 0
    let updated = 0
    let skipped = 0
    let failed = 0
    let processedProducts = 0
    let processedVariants = 0
    let totalVariants = 0

    while (nextUrl) {
      const page = await fetchShopifyProductPage(nextUrl, accessToken)
      const products = page.products
      nextUrl = page.nextUrl

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

          const { data: existingProduct, error: lookupError } =
            await supabaseAdmin
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

          const result = existingProduct
            ? await supabaseAdmin
                .from('products')
                .update(payload)
                .eq('id', existingProduct.id)
                .eq('business_id', businessId)
            : await supabaseAdmin.from('products').insert(payload)

          if (result.error) {
            failed += 1
            pushWarning(warnings, `${payload.name}: ${result.error.message}`)
            continue
          }

          if (existingProduct) {
            updated += 1
          } else {
            imported += 1
          }
        }
      }

      await updateJob(jobId, {
        cursor: nextUrl,
        processed_products: processedProducts,
        processed_variants: processedVariants,
        total_variants: totalVariants,
        imported_count: imported,
        updated_count: updated,
        skipped_count: skipped,
        failed_count: failed,
        warning_count: warnings.length,
        warnings,
        updated_at: new Date().toISOString(),
      })
    }

    const completedAt = new Date().toISOString()
    await updateJob(jobId, {
      status: failed > 0 ? 'completed' : 'completed',
      cursor: null,
      processed_products: processedProducts,
      processed_variants: processedVariants,
      total_variants: totalVariants,
      imported_count: imported,
      updated_count: updated,
      skipped_count: skipped,
      failed_count: failed,
      warning_count: warnings.length,
      warnings,
      completed_at: completedAt,
      updated_at: completedAt,
    })

    await supabaseAdmin
      .from('businesses')
      .update({
        shopify_connected: true,
        shopify_last_sync_at: completedAt,
      })
      .eq('id', businessId)
  } catch (error: any) {
    const failedAt = new Date().toISOString()
    await updateJob(jobId, {
      status: 'failed',
      error_message: error.message || 'Shopify sync failed',
      completed_at: failedAt,
      updated_at: failedAt,
    })
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

async function updateJob(jobId: string, updates: Record<string, any>) {
  const { error } = await supabaseAdmin
    .from('shopify_sync_jobs')
    .update(updates)
    .eq('id', jobId)

  if (error) {
    throw error
  }
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
