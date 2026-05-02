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

    const businessId = 'default'

    if (!message) {
      return twiml('Please send your order message.')
    }

    const customer = await getOrCreateCustomer({
      businessId,
      customerPhone,
      profileName,
    })

    const lowerMessage = message.toLowerCase()

    if (['yes', 'yes please', 'yep', 'yeah'].includes(lowerMessage)) {
      await supabaseAdmin
        .from('customers')
        .update({
          memory_consent: true,
          marketing_consent: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', customer.id)

      return twiml(
        `Perfect ${customer.whatsapp_profile_name || ''} ✅ I’ll remember your usual orders so next time you can just say “my usual”.`
      )
    }

    if (['no', 'no thanks', 'nope'].includes(lowerMessage)) {
      await supabaseAdmin
        .from('customers')
        .update({
          memory_consent: false,
          marketing_consent: false,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', customer.id)

      return twiml(
        'No problem ✅ You can still order normally whenever you like.'
      )
    }

    const wantsUsual =
      lowerMessage.includes('usual') ||
      lowerMessage.includes('same again') ||
      lowerMessage.includes('same as last time') ||
      lowerMessage.includes('get my coffee ready') ||
      lowerMessage.includes('on the way')

    let parsedOrder: any = null

    if (wantsUsual && customer.memory_consent && customer.usual_order) {
      parsedOrder = {
        ...customer.usual_order,
        order_type:
          customer.preferred_order_type ||
          customer.usual_order.order_type ||
          'collection',
        missing_info: [],
        reply: 'No problem — I’ve loaded your usual order.',
      }
    } else if (wantsUsual && !customer.usual_order) {
      return twiml(
        'I don’t know your usual order yet. Send me your order once and I can remember it for next time.'
      )
    } else {
      parsedOrder = await parseOrderWithAI(message, businessId)
    }

    if (!parsedOrder.items || parsedOrder.items.length === 0) {
      return twiml(
        parsedOrder.reply ||
          'Sorry, I could not find that item on the menu. Please try another order.'
      )
    }

    if (
      parsedOrder.missing_info &&
      parsedOrder.missing_info.length > 0 &&
      customer.preferred_order_type
    ) {
      parsedOrder.order_type = customer.preferred_order_type
      parsedOrder.missing_info = parsedOrder.missing_info.filter(
        (item: string) => item !== 'delivery_or_collection'
      )
    }

    if (parsedOrder.missing_info && parsedOrder.missing_info.length > 0) {
      return twiml(parsedOrder.reply || 'Is that for collection or delivery?')
    }

    const { data: savedOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id: businessId,
        customer_id: customer.id,
        customer_phone: customerPhone,
        customer_profile_name: profileName,
        customer_message: message,
        items: parsedOrder.items,
        unavailable_items: parsedOrder.unavailable_items || [],
        order_type: parsedOrder.order_type || '',
        missing_info: parsedOrder.missing_info || [],
        subtotal: parsedOrder.subtotal || 0,
        ai_reply: parsedOrder.reply || '',
        payment_status: 'pending',
        order_status: 'new',
      })
      .select()
      .single()

    if (orderError) {
      return twiml('Sorry, I could not save your order. Please try again.')
    }

    const lineItems = parsedOrder.items.map((item: any) => ({
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
        customer_id: customer.id,
        business_id: businessId,
      },
    })

    await supabaseAdmin
      .from('orders')
      .update({
        stripe_checkout_url: session.url,
        stripe_session_id: session.id,
      })
      .eq('id', savedOrder.id)

    const itemSummary = parsedOrder.items
      .map(
        (item: any) =>
          `${item.quantity} x ${item.name} - £${Number(
            item.line_total
          ).toFixed(2)}`
      )
      .join('\n')

    let consentMessage = ''

    if (!customer.consent_asked_at) {
      await supabaseAdmin
        .from('customers')
        .update({
          consent_asked_at: new Date().toISOString(),
        })
        .eq('id', customer.id)

      consentMessage =
        '\n\nWant me to remember your usual order for next time? Reply YES or NO.'
    }

    return twiml(
      `Order received ✅\n\n${itemSummary}\n\nOrder type: ${
        parsedOrder.order_type
      }\nTotal: £${Number(parsedOrder.subtotal).toFixed(
        2
      )}\n\nPay here:\n${session.url}${consentMessage}`
    )
  } catch (error: any) {
    console.log('WHATSAPP ERROR:', error)

    return twiml(
      'Sorry, something went wrong while processing your order. Please try again.'
    )
  }
}

async function getOrCreateCustomer({
  businessId,
  customerPhone,
  profileName,
}: {
  businessId: string
  customerPhone: string
  profileName: string
}) {
  const { data: existingCustomer } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone', customerPhone)
    .maybeSingle()

  if (existingCustomer) {
    const { data: updatedCustomer } = await supabaseAdmin
      .from('customers')
      .update({
        whatsapp_profile_name:
          existingCustomer.whatsapp_profile_name || profileName,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', existingCustomer.id)
      .select()
      .single()

    return updatedCustomer || existingCustomer
  }

  const { data: newCustomer, error } = await supabaseAdmin
    .from('customers')
    .insert({
      business_id: businessId,
      phone: customerPhone,
      whatsapp_profile_name: profileName,
      last_seen_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return newCustomer
}

async function parseOrderWithAI(message: string, businessId: string) {
  const { data: products, error: productError } = await supabaseAdmin
    .from('products')
    .select('name, description, price, category, is_available')
    .eq('is_available', true)

  if (productError) {
    throw new Error(productError.message)
  }

  if (!products || products.length === 0) {
    return {
      intent: 'unknown_or_question',
      items: [],
      unavailable_items: [],
      order_type: '',
      missing_info: [],
      subtotal: 0,
      reply: 'No menu is loaded yet. Please import a menu first.',
    }
  }

  const menuText = JSON.stringify(products, null, 2)

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
You are a WhatsApp AI ordering assistant for a UK business.

LIVE MENU:
${menuText}

Rules:
- Only sell items from the live menu.
- Do not invent products or prices.
- Currency is GBP.
- order_type must be "delivery", "collection", or "".
- If delivery or collection is missing, add "delivery_or_collection" to missing_info.
- If no valid item is found, intent must be "unknown_or_question".
- Return valid JSON only.

Return this exact structure:
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

  return JSON.parse(completion.choices[0].message.content || '{}')
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