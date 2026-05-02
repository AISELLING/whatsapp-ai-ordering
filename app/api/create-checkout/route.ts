import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: Request) {
  try {
    const order = await req.json()

    const { data: savedOrder, error } = await supabaseAdmin
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
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: true, message: error.message }, { status: 500 })
    }

    const lineItems = order.items.map((item: any) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(Number(item.unit_price) * 100),
      },
      quantity: Number(item.quantity),
    }))

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        order_id: savedOrder.id,
      },
    })

    await supabaseAdmin
      .from('orders')
      .update({
        stripe_checkout_url: session.url,
        stripe_session_id: session.id,
      })
      .eq('id', savedOrder.id)

    return NextResponse.json({
      success: true,
      checkout_url: session.url,
      order_id: savedOrder.id,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Checkout failed' },
      { status: 500 }
    )
  }
}