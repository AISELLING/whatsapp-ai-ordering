import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (error: any) {
    return new Response(`Webhook error: ${error.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.order_id

    if (orderId) {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          stripe_payment_intent: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single()

      if (order?.customer_phone && order?.business_id) {
        const usualOrder = {
          intent: 'create_order',
          items: order.items || [],
          unavailable_items: [],
          order_type: order.order_type || 'collection',
          missing_info: [],
          subtotal: order.subtotal || 0,
          reply: 'Loaded your usual order.',
        }

        await supabaseAdmin.from('customers').upsert(
          {
            business_id: order.business_id,
            phone: order.customer_phone,
            whatsapp_profile_name: order.customer_profile_name || '',
            usual_order: usualOrder,
            last_order_text: `${order.order_type || 'collection'} order - £${Number(
              order.subtotal || 0
            ).toFixed(2)}`,
            preferred_order_type: order.order_type || 'collection',
            last_order_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: 'business_id,phone',
          }
        )
      }
    }
  }

  return new Response('Webhook received', { status: 200 })
}