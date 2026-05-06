import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = String(body.message || '').trim()
    const businessId =
      typeof body.business_id === 'string' && body.business_id
        ? body.business_id
        : null

    if (!message) {
      return NextResponse.json(
        { error: true, message: 'message is required' },
        { status: 400 }
      )
    }

    let productQuery = supabaseAdmin
      .from('products')
      .select('name, description, price, category, is_available')
      .eq('is_available', true)

    if (businessId) {
      productQuery = productQuery.eq('business_id', businessId)
    }

    const { data: products, error } = await productQuery

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    const menuText = JSON.stringify(products || [], null, 2)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You are an expert AI assistant for UK businesses.

LIVE BUSINESS MENU:
${menuText}

If the message is an order, return EXACTLY:
{
  "type": "order",
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

If the message is a booking request (for example grooming, appointments, time slots), return EXACTLY:
{
  "type": "booking",
  "intent": "booking",
  "customer_name": "",
  "service": "",
  "dog_breed": "",
  "dog_size": "",
  "date": "",
  "time": "",
  "notes": "",
  "reply": ""
}

Rules:
- Use only valid JSON.
- For orders, only use items in LIVE BUSINESS MENU.
- For bookings, extract as much detail as available.
          `,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const aiResponse = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(aiResponse)

    if (parsed.intent === 'booking' || parsed.type === 'booking') {
      return NextResponse.json({
        type: 'booking',
        intent: 'booking',
        customer_name: parsed.customer_name || '',
        service: parsed.service || '',
        dog_breed: parsed.dog_breed || '',
        dog_size: parsed.dog_size || '',
        date: parsed.date || '',
        time: parsed.time || '',
        notes: parsed.notes || '',
        reply: parsed.reply || '',
      })
    }

    return NextResponse.json({
      type: 'order',
      intent: parsed.intent || 'create_order',
      items: Array.isArray(parsed.items) ? parsed.items : [],
      unavailable_items: Array.isArray(parsed.unavailable_items)
        ? parsed.unavailable_items
        : [],
      order_type: parsed.order_type || '',
      missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info : [],
      subtotal: Number(parsed.subtotal || 0),
      reply: parsed.reply || '',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Something went wrong',
      },
      { status: 500 }
    )
  }
}
