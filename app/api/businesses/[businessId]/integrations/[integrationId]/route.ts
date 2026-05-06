import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type RouteContext = {
  params: Promise<{
    businessId: string
    integrationId: string
  }>
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { businessId, integrationId } = await context.params
    const access = await requireBusinessAccess(req, businessId)

    if (!access.ok) {
      return access.response
    }

    const { error } = await supabaseAdmin
      .from('integrations')
      .delete()
      .eq('id', integrationId)
      .eq('business_id', businessId)

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Integration disconnected',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to disconnect integration' },
      { status: 500 }
    )
  }
}
