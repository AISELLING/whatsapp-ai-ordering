import OpenAI from 'openai'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const BUSINESS_ID = '181e3724-b538-4bc5-b5f0-0bf5daa0191c'

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

    if (looksLikeBroadProductRequest(message)) {
      const suggestions = await getProductSuggestions(message)

      if (suggestions.length > 0) {
        return twiml(
          `Got it. Here are some options:\n${formatSuggestions(
            suggestions
          )}\n\nReply with the exact product name and quantity (for example: 2 x Cellucor C4 390g).`
        )
      }

      return twiml(
        'Got it. Please tell me the exact product name and quantity you want.'
      )
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
  if (looksLikeBookingMessage(message)) {
    const bookingCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You must respond with valid JSON only.
Extract booking request details from the customer message.
Return:
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

    return JSON.parse(bookingCompletion.choices[0].message.content || '{}')
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, price, category, is_available')
    .eq('business_id', BUSINESS_ID)
    .eq('is_available', true)
    .limit(100)

  const menuLines = (products || [])
    .map((product) => {
      const name = String(product.name || '').trim()
      const price = Number(product.price || 0).toFixed(2)
      const category = String(product.category || 'Uncategorised').trim()
      return `- ${name} | £${price} | ${category}`
    })
    .join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
You must respond with valid JSON only.
You are parsing a food/product order for a UK business.
Use only items from this menu:
${menuLines || '- No menu items available'}

Return:
{
  "type":"order",
  "intent":"create_order",
  "items":[{"name":"","quantity":1,"unit_price":0,"line_total":0,"notes":""}],
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

async function getProductSuggestions(message: string) {
  const term = getBestSearchTerm(message)

  if (!term) return []

  const safeTerm = term.replaceAll('%', '').replaceAll(',', ' ').trim()

  if (!safeTerm) return []

  const { data } = await supabaseAdmin
    .from('products')
    .select('name, price, category')
    .eq('business_id', BUSINESS_ID)
    .eq('is_available', true)
    .or(`name.ilike.%${safeTerm}%,category.ilike.%${safeTerm}%`)
    .order('name', { ascending: true })
    .limit(6)

  return data || []
}

function formatSuggestions(
  suggestions: Array<{ name?: string; price?: number; category?: string }>
) {
  return suggestions
    .map((item, index) => {
      const name = item.name || 'Product'
      const price = Number(item.price || 0).toFixed(2)
      const category = item.category ? ` (${item.category})` : ''
      return `${index + 1}. ${name}${category} - £${price}`
    })
    .join('\n')
}

function getBestSearchTerm(message: string) {
  const tokens = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !COMMON_STOPWORDS.has(token))

  const preferred = tokens.find((token) => BROAD_KEYWORDS.has(token))
  return preferred || tokens[0] || ''
}

function looksLikeBookingMessage(message: string) {
  const lower = message.toLowerCase()
  const keywords = [
    'book',
    'booking',
    'appointment',
    'groom',
    'grooming',
    'slot',
    'schedule',
    'available time',
    'availability',
    'dog',
    'puppy',
  ]

  return keywords.some((keyword) => lower.includes(keyword))
}

function looksLikeBroadProductRequest(message: string) {
  const lower = message.toLowerCase()
  const hasQuantity = /\b\d+\b/.test(lower) || /\b(x|qty|quantity)\b/.test(lower)
  if (hasQuantity) return false

  if (looksLikeBookingMessage(message)) return false

  const hasBroadKeyword = Array.from(BROAD_KEYWORDS).some((keyword) =>
    lower.includes(keyword)
  )

  if (!hasBroadKeyword) return false

  const tokenCount = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length

  return tokenCount <= 6
}

const BROAD_KEYWORDS = new Set([
  'cellucor',
  'protein',
  'creatine',
  'preworkout',
  'pre-workout',
  'whey',
  'mass',
  'gainer',
  'supplement',
  'supplements',
  'bcaa',
  'vitamin',
])

const COMMON_STOPWORDS = new Set([
  'i',
  'want',
  'need',
  'some',
  'a',
  'an',
  'the',
  'please',
  'for',
  'with',
  'to',
  'buy',
  'get',
  'order',
  'of',
])

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
