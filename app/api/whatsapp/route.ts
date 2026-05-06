import OpenAI from 'openai'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const BUSINESS_ID = '9a3325d2-72aa-4647-a7c8-584859c2b624'

type ParsedOrder = {
  type?: 'order' | 'booking'
  intent?: string
  items?: Array<{
    name?: string
    quantity?: number
    unit_price?: number
    line_total?: number
    notes?: string
  }>
  subtotal?: number
  order_type?: string
}

type ParsedBooking = {
  type?: 'order' | 'booking'
  intent?: string
  customer_name?: string
  service?: string
  dog_breed?: string
  dog_size?: string
  date?: string
  time?: string
  notes?: string
}

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const params = new URLSearchParams(rawBody)

    const message = (params.get('Body') || '').trim()
    const customerPhone = params.get('From') || ''
    const profileName = params.get('ProfileName') || ''
    const lower = message.toLowerCase()

    if (!message) {
      return twiml('Hey! What can I get you today?')
    }

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('phone', customerPhone)
      .eq('business_id', BUSINESS_ID)
      .maybeSingle()

    const wantsUsual =
      lower.includes('usual') ||
      lower.includes('same again') ||
      lower.includes('my regular')

    if (wantsUsual) {
      if (!customer?.usual_order) {
        return twiml("I don't know your usual yet. Order once first.")
      }

      return createOrder(customer.usual_order, customerPhone, profileName)
    }

    const parsed = await parseMessage(message)
    const isBooking = parsed.intent === 'booking' || parsed.type === 'booking'

    if (isBooking) {
      const booking = parsed as ParsedBooking

      await supabaseAdmin.from('bookings').insert({
        business_id: BUSINESS_ID,
        customer_phone: customerPhone,
        customer_name: booking.customer_name || profileName || '',
        service: booking.service || '',
        dog_breed: booking.dog_breed || '',
        dog_size: booking.dog_size || '',
        requested_date: booking.date || '',
        requested_time: booking.time || '',
        notes: booking.notes || '',
        status: 'pending',
      })

      return twiml(
        "Thanks, your booking request has been received. We'll confirm shortly."
      )
    }

    const order = parsed as ParsedOrder

    if (!Array.isArray(order.items) || order.items.length === 0) {
      return twiml("Sorry, I didn't understand that.")
    }

    return createOrder(order, customerPhone, profileName)
  } catch (err: any) {
    return twiml(`Error: ${err.message}`)
  }
}

async function parseMessage(message: string): Promise<ParsedOrder | ParsedBooking> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('business_id', BUSINESS_ID)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
Menu:
${JSON.stringify(products)}

If this is an order, return:
{
  "type":"order",
  "intent":"create_order",
  "items":[{"name":"","quantity":1,"unit_price":0,"line_total":0,"notes":""}],
  "subtotal":0,
  "order_type":"collection"
}

If this is a booking request, return:
{
  "type":"booking",
  "intent":"booking",
  "customer_name":"",
  "service":"",
  "dog_breed":"",
  "dog_size":"",
  "date":"",
  "time":"",
  "notes":""
}
        `,
      },
      { role: 'user', content: message },
    ],
  })

  return JSON.parse(completion.choices[0].message.content || '{}')
}

async function createOrder(parsed: ParsedOrder, phone: string, profileName: string) {
  const items = Array.isArray(parsed.items) ? parsed.items : []
  const orderType = parsed.order_type === 'delivery' ? 'delivery' : 'collection'
  const subtotal = Number(parsed.subtotal || 0)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .insert({
      business_id: BUSINESS_ID,
      customer_phone: phone,
      customer_profile_name: profileName,
      items,
      subtotal,
      order_type: orderType,
      payment_status: 'pending',
    })
    .select()
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: items.map((item) => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: item.name || 'Item' },
        unit_amount: Math.round(Number(item.unit_price || 0) * 100),
      },
      quantity: Number(item.quantity || 1),
    })),
    success_url: `${getBaseUrl()}/success`,
    cancel_url: `${getBaseUrl()}/cancel`,
    metadata: { order_id: order.id },
  })

  await supabaseAdmin
    .from('orders')
    .update({ stripe_checkout_url: session.url })
    .eq('id', order.id)

  const summary = items
    .map((item) => `${Number(item.quantity || 1)} x ${item.name || 'Item'}`)
    .join('\n')

  const typeLine =
    orderType === 'delivery'
      ? "We'll get that delivered."
      : 'Ready for collection.'

  return twiml(
    `Nice one.\n\n${summary}\n\n${typeLine}\nTotal: £${subtotal.toFixed(2)}\n\nPay here:\n${session.url}`
  )
}

function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${escapeXml(message)}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
