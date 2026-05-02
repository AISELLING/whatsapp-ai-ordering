import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const order = await req.json()

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_message: order.customer_message || '',
        items: order.items || [],
        unavailable_items: order.unavailable_items || [],
        order_type: order.order_type || '',
        missing_info: order.missing_info || [],
        subtotal: order.subtotal || 0,
        ai_reply: order.reply || '',
        payment_status: 'pending',
        stripe_checkout_url: order.stripe_checkout_url || '',
      })
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
      message: 'Order saved to Supabase',
      order: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to save order',
      },
      { status: 500 }
    )
  }
}