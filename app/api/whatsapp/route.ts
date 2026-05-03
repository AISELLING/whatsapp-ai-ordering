import OpenAI from 'openai'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

// 🔥 IMPORTANT: PASTE YOUR BUSINESS ID HERE
const BUSINESS_ID = 'PASTE_YOUR_BUSINESS_ID_HERE'

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
      return twiml('Hey 👋 What can I get you today?')
    }

    // 🔥 GET CUSTOMER (NOW LOCKED TO BUSINESS)
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('phone', customerPhone)
      .eq('business_id', BUSINESS_ID)
      .maybeSingle()

    // =========================
    // 🔥 USUAL FLOW
    // =========================
    const wantsUsual =
      lower.includes('usual') ||
      lower.includes('same again') ||
      lower.includes('my regular')

    if (wantsUsual) {
      if (!customer?.usual_order) {
        return twiml("I don’t know your usual yet. Order once 👍")
      }

      return createOrder(customer.usual_order, customerPhone, profileName)
    }

    // =========================
    // 🧠 AI PARSE ORDER
    // =========================
    const parsed = await parseOrder(message)

    if (!parsed.items || parsed.items.length === 0) {
      return twiml('Sorry, I didn’t understand that.')
    }

    return createOrder(parsed, customerPhone, profileName)

  } catch (err: any) {
    return twiml(`Error: ${err.message}`)
  }
}

// =========================
// 🧠 PARSE ORDER (BUSINESS LOCKED)
// =========================
async function parseOrder(message: string) {
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

Return JSON:
{
  "items": [{"name":"","quantity":1,"unit_price":0,"line_total":0}],
  "subtotal":0,
  "order_type":"collection"
}
        `,
      },
      { role: 'user', content: message },
    ],
  })

  return JSON.parse(completion.choices[0].message.content || '{}')
}

// =========================
// 💳 CREATE ORDER
// =========================
async function createOrder(parsed: any, phone: string, profileName: string) {

  const orderType =
    parsed.order_type === 'delivery' ? 'delivery' : 'collection'

  const { data: order } = await supabaseAdmin
    .from('orders')
    .insert({
      business_id: BUSINESS_ID,
      customer_phone: phone,
      customer_profile_name: profileName,
      items: parsed.items,
      subtotal: parsed.subtotal,
      order_type: orderType,
      payment_status: 'pending',
    })
    .select()
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: parsed.items.map((i: any) => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: i.name },
        unit_amount: Math.round(i.unit_price * 100),
      },
      quantity: i.quantity,
    })),
    success_url: `${getBaseUrl()}/success`,
    cancel_url: `${getBaseUrl()}/cancel`,
    metadata: { order_id: order.id },
  })

  await supabaseAdmin
    .from('orders')
    .update({ stripe_checkout_url: session.url })
    .eq('id', order.id)

  const summary = parsed.items
    .map((i: any) => `${i.quantity} x ${i.name}`)
    .join('\n')

  const typeLine =
    orderType === 'delivery'
      ? 'We’ll get that delivered 🚚'
      : 'Ready for collection 👍'

  return twiml(
    `Nice one 👌\n\n${summary}\n\n${typeLine}\nTotal: £${parsed.subtotal}\n\nPay here:\n${session.url}`
  )
}

// =========================
// 📲 TWILIO RESPONSE
// =========================
function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}