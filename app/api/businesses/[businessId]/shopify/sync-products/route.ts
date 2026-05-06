import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const STUCK_JOB_MINUTES = 30

type RouteContext = {
  params: Promise<{
    businessId: string
  }>
}

type ActiveJob = {
  id: string
  status: 'queued' | 'running'
  created_at?: string | null
  started_at?: string | null
  updated_at?: string | null
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
      .select('id, status, created_at, started_at, updated_at')
      .eq('business_id', businessId)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ActiveJob>()

    if (activeJobError) {
      return NextResponse.json(
        { error: true, message: activeJobError.message },
        { status: 500 }
      )
    }

    if (activeJob) {
      const jobTimestamp =
        activeJob.updated_at || activeJob.started_at || activeJob.created_at
      const isStuck = isOlderThanMinutes(jobTimestamp, STUCK_JOB_MINUTES)

      if (isStuck) {
        const failedAt = new Date().toISOString()
        await supabaseAdmin
          .from('shopify_sync_jobs')
          .update({
            status: 'failed',
            error_message: `Marked failed automatically after exceeding ${STUCK_JOB_MINUTES} minutes without completion`,
            completed_at: failedAt,
            updated_at: failedAt,
          })
          .eq('id', activeJob.id)
      } else {
        return NextResponse.json({
          success: true,
          jobId: activeJob.id,
          alreadyRunning: true,
        })
      }
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
      alreadyRunning: false,
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

function isOlderThanMinutes(value: string | null | undefined, minutes: number) {
  if (!value) {
    return false
  }

  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) {
    return false
  }

  const ageMs = Date.now() - parsed
  return ageMs > minutes * 60 * 1000
}
