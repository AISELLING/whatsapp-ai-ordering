import OpenAI from 'openai'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

async function getBusiness() {
  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('slug', 'demo-food-shop')
    .single()

  if (error) throw new Error(error.message)

  return business
}

export async function GET() {
  return new Response('WhatsApp AI ordering webhook is live ✅')
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    const params = new URLSearchParams(rawBody)

    const message = (params.get('Body') || '').trim()
    const customerPhone = params.get('From') || ''
    const profileName = params.get('ProfileName') || ''
    const lower = message.toLowerCase()

    const business = await getBusiness()

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('phone', customerPhone)
      .eq('business_id', business.id)
      .maybeSingle()

    if (!message) {
      return twiml('Hey 👋 What can I get you today?')
    }

    const greetingOnly = [
      'hi',
      'hello',
      'hey',
      'yo',
      'hiya',
      'morning',
      'afternoon',
      'evening',
    ].includes(lower)

    if (greetingOnly && customer?.usual_order?.items?.length > 0) {
      const summary = customer.usual_order.items
        .map((item: any) => `${item.quantity} x ${item.name}`)
        .join(', ')

      return twiml(
        `Hey ${profileName || ''} 👋 Fancy your usual?\n\n${summary}\n\nReply “usual” and I’ll sort it.`
      )
    }

    if (greetingOnly) {
      return twiml(`Hey ${profileName || ''} 👋 What can I get you today?`)
    }

    const wantsUsual =
      lower.includes('usual') ||
      lower.includes('same again') ||
      lower.includes('same as last time') ||
      lower.includes('my regular') ||
      lower.includes('what i normally get')

    const onTheWay =
      lower.includes('on the way') ||
      lower.includes("i'm coming") ||
      lower.includes('im coming') ||
      lower.includes('start my coffee') ||
      lower.includes('get my coffee ready')

    if (wantsUsual || onTheWay) {
      const usual = await getUsualOrder(customerPhone, business.id)

      if (!usual) {
        return twiml(
          "I don't know your usual order yet. Order once, pay, and I’ll remember it for next time 👍"
        )
      }

      const preferredOrderType =
        detectOrderTypeFromMessage(lower) ||
        customer?.preferred_order_type ||
        usual.order_type ||
        customer?.last_order?.order_type ||
        'collection'

      const fixedUsual = {
        ...usual,
        order_type: preferredOrderType,
      }

      return createOrderAndPayment({
        business,
        message,
        customerPhone,
        profileName,
        parsed: fixedUsual,
        intro: onTheWay
          ? 'Got it 👌 We’ll get your usual ready.'
          : 'Same again? Nice one 👌',
      })
    }

    const parsed = await parseOrder(message, business.id)

    if (!parsed.items || parsed.items.length === 0) {
      return twiml(
        parsed.reply ||
          'Sorry, I could not find that on the menu. Please send your order again.'
      )
    }

    const finalOrderType =
      detectOrderTypeFromMessage(lower) ||
      customer?.preferred_order_type ||
      parsed.order_type ||
      'collection'

    parsed.order_type = finalOrderType

    return createOrderAndPayment({
      business,
      message,
      customerPhone,
      profileName,
      parsed,
      intro: 'Nice one 👌',
    })
  } catch (error: any) {
    return twiml(`System error: ${error.message || 'Unknown error'}`)
  }
}

function detectOrderTypeFromMessage(message: string) {
  if (message.includes('collection') || message.includes('collect')) {
    return 'collection'
  }

  if (message.includes('delivery') || message.includes('deliver')) {
    return 'delivery'
  }

  return null
}

async function getUsualOrder(customerPhone: string, businessId: string) {
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('phone', customerPhone)
    .eq('business_id', businessId)
    .maybeSingle()

  if (customer?.usual_order?.items?.length > 0) {
    return customer.usual_order
  }

  const { data: lastPaidOrder } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('customer_phone', customerPhone)
    .eq('business_id', businessId)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!lastPaidOrder?.items?.length) return null

  return {
    intent: 'create_order',
    items: lastPaidOrder.items,
    unavailable_items: [],
    order_type: lastPaidOrder.order_type || 'collection',
    missing_info: [],
    subtotal: lastPaidOrder.subtotal || 0,
    reply: 'Loaded your usual order.',
  }
}

async function parseOrder(message: string, businessId: string) {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('name, description, price, category, is_available')
    .eq('business_id', businessId)
    .eq('is_available', true)

  if (error) throw new Error(error.message)

  if (!products || products.length === 0) {
    return {
      intent: 'unknown_or_question',
      items: [],
      unavailable_items: [],
      order_type: 'collection',
      missing_info: [],
      subtotal: 0,
      reply: 'No menu is loaded yet.',
    }
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
You are a friendly WhatsApp AI ordering assistant.

LIVE MENU:
${JSON.stringify(products, null, 2)}

Rules:
- Understand casual human messages.
- Only sell live menu items.
- Do not invent products or prices.
- Currency is GBP.
- If customer does not say delivery or collection, use "collection".
- order_type must be "delivery" or "collection".
- Return JSON only.

Return exact JSON:
{
  "intent": "create_order",
  "items": [
    {
      "name": "",
      "quantity": 0,
      "unit_price": 0,
      "line_total": 0,
      "notes": ""
    }
  ],
  "unavailable_items": [],
  "order_type": "collection",
  "missing_info": [],
  "subtotal": 0,
  "reply": ""
}
        `,
      },
      { role: 'user', content: message },
    ],
  })

  const parsed = JSON.parse(completion.choices[0].message.content || '{}')

  return {
    intent: parsed.intent || 'create_order',
    items: parsed.items || [],
    unavailable_items: parsed.unavailable_items || [],
    order_type: parsed.order_type || 'collection',
    missing_info: parsed.missing_info || [],
    subtotal: Number(parsed.subtotal || 0),
    reply: parsed.reply || '',
  }
}

async function createOrderAndPayment({
  business,
  message,
  customerPhone,
  profileName,
  parsed,
  intro,
}: any) {
  const cleanOrderType =
    parsed.order_type === 'delivery' ? 'delivery' : 'collection'

  const { data: savedOrder, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      business_id: business.id,
      customer_phone: customerPhone,
      customer_profile_name: profileName,
      customer_message: message,
      items: parsed.items,
      unavailable_items: parsed.unavailable_items || [],
      order_type: cleanOrderType,
      missing_info: parsed.missing_info || [],
      subtotal: Number(parsed.subtotal || 0),
      ai_reply: parsed.reply || '',
      payment_status: 'pending',
      order_status: 'new',
    })
    .select()
    .single()

  if (orderError) {
    return twiml(`Order save error: ${orderError.message}`)
  }

  const lineItems = parsed.items.map((item: any) => ({
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
    success_url: `${getBaseUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getBaseUrl()}/cancel`,
    metadata: {
      order_id: savedOrder.id,
      business_id: business.id,
    },
  })

  await supabaseAdmin
    .from('orders')
    .update({
      stripe_checkout_url: session.url,
      stripe_session_id: session.id,
    })
    .eq('id', savedOrder.id)

  const itemSummary = parsed.items
    .map(
      (item: any) =>
        `${item.quantity} x ${item.name} - £${Number(item.line_total).toFixed(2)}`
    )
    .join('\n')

  const orderTypeLine =
    cleanOrderType === 'delivery'
      ? 'We’ll get that delivered 🚚'
      : 'Ready for collection 👍'

  return twiml(
    `${business.name}\n\n${intro}\n\n${itemSummary}\n\n${orderTypeLine}\nTotal: £${Number(
      parsed.subtotal || 0
    ).toFixed(2)}\n\nPay here:\n${session.url}`
  )
}

function twiml(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    }
  )
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}