import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { order_id, order_status } = body

    if (!order_id || !order_status) {
      return NextResponse.json(
        { error: true, message: 'Missing order_id or order_status' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ order_status })
      .eq('id', order_id)
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