import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, order_status, business_id } = body

    if (!order_id || !order_status || !business_id) {
      return NextResponse.json(
        { error: true, message: 'Missing order_id, order_status, or business_id' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ order_status })
      .eq('id', order_id)
      .eq('business_id', business_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to update order' },
      { status: 500 }
    )
  }
}
