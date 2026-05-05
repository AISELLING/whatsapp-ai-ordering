import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    businessId: string
    jobId: string
  }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { businessId, jobId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { data: job, error } = await supabaseAdmin
      .from('shopify_sync_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('business_id', businessId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to load Shopify sync job',
      },
      { status: 500 }
    )
  }
}
