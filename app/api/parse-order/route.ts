import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = body.message

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('name, description, price, category, is_available')
      .eq('is_available', true)

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
You are an expert AI ordering assistant for a UK food business.

LIVE BUSINESS MENU:
${menuText}

RULES:
- Currency is GBP only. Use £ in customer replies, never $.
- Only use items from the LIVE BUSINESS MENU.
- Do not invent products, prices, discounts, offers, delivery fees, opening times, or policies.
- Extract product name, quantity, unit_price, line_total, and notes.
- Notes should include modifications like "no onions", "extra sauce", etc.
- Calculate subtotal correctly.
- If customer says delivery or collection, capture it in order_type.
- order_type must be either "delivery", "collection", or "".
- If delivery/collection is missing, add "delivery_or_collection" to missing_info.
- If customer requests an unavailable item, add it to unavailable_items and do not include it in items.
- If no valid menu items are found, set intent to "unknown_or_question".
- Always write a short helpful reply to the customer.
- If order is complete, ask them to confirm before payment.
- The reply must always include the subtotal formatted as GBP when there are valid items.
- Return valid JSON only.

RETURN EXACT JSON STRUCTURE:
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

    const aiResponse = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(aiResponse)

    return NextResponse.json(parsed)
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