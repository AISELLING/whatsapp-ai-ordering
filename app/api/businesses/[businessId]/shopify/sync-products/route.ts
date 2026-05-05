import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    console.log('Creating Shopify sync job')

    const now = new Date().toISOString()
    const { data: job, error: jobError } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .insert({
        business_id: businessId,
        requested_by: access.user.id,
        status: 'queued',
        sync_type: 'products',
        started_at: now,
        warnings: [],
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('Failed to create Shopify sync job', jobError)
      return NextResponse.json(
        {
          error: true,
          message: jobError?.message || 'Failed to create Shopify sync job',
        },
        { status: 500 }
      )
    }

    console.log(`Job created: ${job.id}`)

    return NextResponse.json({
      success: true,
      jobId: job.id,
    })
  } catch (error: any) {
    console.error('Failed to start Shopify sync job', error)
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to start Shopify sync job',
      },
      { status: 500 }
    )
  }
}
