import OpenAI from 'openai'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
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

    if (!message) {
      return twiml('Please send your order.')
    }

    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('name, description, price, category, is_available')
      .eq('is_available', true)

    if (productError) {
      console.log('PRODUCT ERROR:', productError)
      return twiml('Sorry, I could not load the menu. Please try again.')
    }

    if (!products || products.length === 0) {
      return twiml('No menu is loaded yet. Please import a menu first.')
    }

    const menuText = JSON.stringify(products, null, 2)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You are a friendly WhatsApp AI ordering assistant for a UK business.

Understand normal human messages like:
- burger and chips for collection
- can I get burger and chips please
- evening mate can I have a burger and chips
- 2 burgers and chips delivery
- burger no onions

LIVE MENU:
${menuText}

Rules:
- Only sell items from the live menu.
- Do not invent products or prices.
- Currency is GBP.
- order_type must be "delivery", "collection", or "".
- If delivery/collection is missing, add "delivery_or_collection" to missing_info.
- If no valid menu item is found, return intent "unknown_or_question".
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
  "order_type": "",
  "missing_info": [],
  "subtotal": 0,
  "reply": ""
}
          `,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const parsed = JSON.parse(completion.choices[0].message.content || '{}')

    if (!parsed.items || parsed.items.length === 0) {
      return twiml(
        parsed.reply ||
          'Sorry, I could not find that on the menu. Please send your order again.'
      )
    }

    if (parsed.missing_info && parsed.missing_info.length > 0) {
      return twiml(parsed.reply || 'Is that for collection or delivery?')
    }

    const { data: savedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id: 'default',
        customer_phone: customerPhone,
        customer_profile_name: profileName,
        customer_message: message,
        items: parsed.items,
        unavailable_items: parsed.unavailable_items || [],
        order_type: parsed.order_type || '',
        missing_info: parsed.missing_info || [],
        subtotal: parsed.subtotal || 0,
        ai_reply: parsed.reply || '',
        payment_status: 'pending',
        order_status: 'new',
      })
      .select()
      .single()

    if (orderError) {
      console.log('ORDER SAVE ERROR:', orderError)
      return twiml('Sorry, I could not save your order. Please try again.')
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

    const baseUrl = getBaseUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      metadata: {
        order_id: savedOrder.id,
        business_id: 'default',
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

    return twiml(
      `Order received ✅\n\n${itemSummary}\n\nOrder type: ${
        parsed.order_type
      }\nTotal: £${Number(parsed.subtotal).toFixed(2)}\n\nPay here:\n${session.url}`
    )
  } catch (error: any) {
    console.log('WHATSAPP ERROR:', error)

    return twiml(
      `Sorry, something went wrong while processing your order. Please try again.`
    )
  }
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