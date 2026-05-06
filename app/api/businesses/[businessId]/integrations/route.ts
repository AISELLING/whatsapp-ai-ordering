import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import {
  getIntegrationDefinition,
  INTEGRATION_PROVIDER_KEYS,
  isIntegrationProvider,
} from '@/lib/integrations'
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

    const { data, error } = await supabaseAdmin
      .from('integrations')
      .select(
        'id, business_id, provider, category, status, expires_at, external_account_id, external_location_id, metadata, created_at, updated_at'
      )
      .eq('business_id', businessId)
      .order('category', { ascending: true })
      .order('provider', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      integrations: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to load integrations' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { businessId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const body = await req.json().catch(() => ({}))
    const provider = String(body.provider || '').trim()
    const status = String(body.status || 'pending').trim() || 'pending'

    if (!isIntegrationProvider(provider)) {
      return NextResponse.json(
        {
          error: true,
          message: `provider must be one of: ${INTEGRATION_PROVIDER_KEYS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const definition = getIntegrationDefinition(provider)
    const category =
      String(body.category || '').trim() || definition?.category || 'other'
    const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : null
    const metadata =
      body.metadata && typeof body.metadata === 'object' ? body.metadata : {}

    const payload = {
      business_id: businessId,
      provider,
      category,
      status,
      access_token: String(body.access_token || ''),
      refresh_token: String(body.refresh_token || ''),
      expires_at: expiresAt,
      external_account_id: String(body.external_account_id || ''),
      external_location_id: String(body.external_location_id || ''),
      metadata,
    }

    const { data, error } = await supabaseAdmin
      .from('integrations')
      .upsert(payload, { onConflict: 'business_id,provider' })
      .select(
        'id, business_id, provider, category, status, expires_at, external_account_id, external_location_id, metadata, created_at, updated_at'
      )
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      integration: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to save integration' },
      { status: 500 }
    )
  }
}
