import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const menuText = body.menuText

    if (!menuText) {
      return NextResponse.json(
        { error: true, message: 'No menu text provided' },
        { status: 400 }
      )
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
You are an expert menu extraction assistant.

Your job:
Convert messy menu text into clean product data for a restaurant ordering system.

Rules:
- Extract product name, description, price, and category.
- Currency is GBP.
- Price must be a number only, for example 5.99.
- If category is unclear, choose a sensible category.
- Do not invent products.
- Do not invent prices.
- Ignore opening hours, phone numbers, addresses, delivery notes, and marketing text.
- Return valid JSON only.

Return exact structure:
{
  "products": [
    {
      "name": "",
      "description": "",
      "price": 0,
      "category": ""
    }
  ]
}
          `,
        },
        {
          role: 'user',
          content: menuText,
        },
      ],
    })

    const aiResponse = completion.choices[0].message.content || '{}'
    const parsed = JSON.parse(aiResponse)

    const products = parsed.products || []

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: true, message: 'No products found in menu' },
        { status: 400 }
      )
    }

    const cleanProducts = products
      .filter((product: any) => product.name && product.price)
      .map((product: any) => ({
        name: product.name,
        description: product.description || '',
        price: Number(product.price),
        category: product.category || '',
        is_available: true,
      }))

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(cleanProducts)
      .select()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${data.length} products imported successfully`,
      products: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Menu import failed',
      },
      { status: 500 }
    )
  }
}
