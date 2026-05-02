import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json()

    if (!session_id) {
      return NextResponse.json({ error: true, message: 'Missing session_id' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(session_id)

    const orderId = session.metadata?.order_id

    if (!orderId) {
      return NextResponse.json({ error: true, message: 'No order_id found' }, { status: 400 })
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: session.payment_status,
        stripe_payment_intent: session.payment_intent as string,
        paid_at: session.payment_status === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', orderId)

    return NextResponse.json({
      success: true,
      message: 'Order payment updated',
      payment_status: session.payment_status,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to mark paid' },
      { status: 500 }
    )
  }
}