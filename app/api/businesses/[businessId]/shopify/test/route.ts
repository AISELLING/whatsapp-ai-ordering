import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const SHOPIFY_API_VERSION = '2025-10'

type RouteContext = {
  params: Promise<{
    businessId: string
  }>
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const body = await req.json().catch(() => ({}))
    const providedShopDomain = normalizeShopDomain(body.shopify_shop_domain || '')
    const providedAccessToken = String(
      body.shopify_admin_access_token || ''
    ).trim()

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

    const shopDomain = providedShopDomain || business.shopify_shop_domain || ''
    const accessToken =
      providedAccessToken || business.shopify_admin_access_token || ''

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        {
          error: true,
          message: 'Shopify shop domain and admin access token are required',
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

    const shopifyRes = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
      }
    )

    const responseText = await shopifyRes.text()
    const responseJson = safeJson(responseText)

    if (!shopifyRes.ok) {
      await supabaseAdmin
        .from('businesses')
        .update({
          shopify_connected: false,
          shopify_shop_domain: shopDomain,
          shopify_admin_access_token: accessToken,
        })
        .eq('id', businessId)

      return NextResponse.json(
        {
          error: true,
          message:
            responseJson?.errors ||
            responseJson?.error ||
            `Shopify connection failed with status ${shopifyRes.status}`,
        },
        { status: 400 }
      )
    }

    const lastSyncAt = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        shopify_shop_domain: shopDomain,
        shopify_admin_access_token: accessToken,
        shopify_connected: true,
        shopify_last_sync_at: lastSyncAt,
      })
      .eq('id', businessId)

    if (updateError) {
      return NextResponse.json(
        { error: true, message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify connection successful',
      shop: responseJson?.shop || null,
      shopify_connected: true,
      shopify_last_sync_at: lastSyncAt,
      shopify_shop_domain: shopDomain,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to test Shopify connection',
      },
      { status: 500 }
    )
  }
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

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
