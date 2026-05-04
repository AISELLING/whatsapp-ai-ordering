import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    businessId: string
  }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select(
        `
          id,
          name,
          business_type,
          phone,
          whatsapp_number,
          email,
          delivery_enabled,
          collection_enabled,
          delivery_radius,
          delivery_fee,
          free_delivery_threshold,
          default_prep_time,
          cash_on_delivery_enabled,
          stripe_enabled,
          ai_greeting_message,
          shopify_shop_domain,
          shopify_admin_access_token,
          shopify_connected,
          shopify_last_sync_at
        `
      )
      .eq('id', businessId)
      .single()

    if (businessError) {
      return NextResponse.json(
        { error: true, message: businessError.message },
        { status: 500 }
      )
    }

    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, address, postcode')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (branchError) {
      return NextResponse.json(
        { error: true, message: branchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      business,
      branch,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to load settings' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const body = await req.json()

    if (!body.name) {
      return NextResponse.json(
        { error: true, message: 'Business name is required' },
        { status: 400 }
      )
    }

    const { data: existingBusiness, error: existingBusinessError } =
      await supabaseAdmin
        .from('businesses')
        .select('shopify_shop_domain, shopify_admin_access_token, shopify_connected')
        .eq('id', businessId)
        .single()

    if (existingBusinessError) {
      return NextResponse.json(
        { error: true, message: existingBusinessError.message },
        { status: 500 }
      )
    }

    const shopifyShopDomain = normalizeShopDomain(body.shopify_shop_domain || '')
    const shopifyAdminAccessToken = String(
      body.shopify_admin_access_token || ''
    ).trim()
    const shopifyCredentialsChanged =
      shopifyShopDomain !== (existingBusiness.shopify_shop_domain || '') ||
      shopifyAdminAccessToken !==
        (existingBusiness.shopify_admin_access_token || '')

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .update({
        name: body.name,
        business_type: body.business_type || 'restaurant',
        phone: body.phone || '',
        whatsapp_number: body.whatsapp_number || '',
        email: body.email || '',
        delivery_enabled: Boolean(body.delivery_enabled),
        collection_enabled: Boolean(body.collection_enabled),
        delivery_radius: Number(body.delivery_radius || 0),
        delivery_fee: Number(body.delivery_fee || 0),
        free_delivery_threshold: Number(body.free_delivery_threshold || 0),
        default_prep_time: Number(body.default_prep_time || 0),
        cash_on_delivery_enabled: Boolean(body.cash_on_delivery_enabled),
        stripe_enabled: Boolean(body.stripe_enabled),
        ai_greeting_message: body.ai_greeting_message || '',
        shopify_shop_domain: shopifyShopDomain,
        shopify_admin_access_token: shopifyAdminAccessToken,
        shopify_connected: shopifyCredentialsChanged
          ? false
          : Boolean(existingBusiness.shopify_connected),
      })
      .eq('id', businessId)
      .select()
      .single()

    if (businessError) {
      return NextResponse.json(
        { error: true, message: businessError.message },
        { status: 500 }
      )
    }

    const { data: existingBranch, error: branchLookupError } = await supabaseAdmin
      .from('branches')
      .select('id')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (branchLookupError) {
      return NextResponse.json(
        { error: true, message: branchLookupError.message },
        { status: 500 }
      )
    }

    const branchPayload = {
      business_id: businessId,
      name: 'Main Branch',
      address: body.address || '',
      postcode: body.postcode || '',
      phone: body.phone || '',
      is_active: true,
    }

    const branchResult = existingBranch
      ? await supabaseAdmin
          .from('branches')
          .update(branchPayload)
          .eq('id', existingBranch.id)
          .select()
          .single()
      : await supabaseAdmin
          .from('branches')
          .insert(branchPayload)
          .select()
          .single()

    if (branchResult.error) {
      return NextResponse.json(
        { error: true, message: branchResult.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      business,
      branch: branchResult.data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to save settings' },
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
