import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

async function getDemoBusiness() {
  const { data, error } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('slug', 'demo-food-shop')
    .single()

  if (error) throw new Error(error.message)

  return data
}

export async function GET() {
  try {
    const business = await getDemoBusiness()

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, products: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const business = await getDemoBusiness()

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        business_id: business.id,
        name: body.name,
        description: body.description || '',
        price: Number(body.price),
        category: body.category || '',
        is_available: body.is_available ?? true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, product: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to add product' },
      { status: 500 }
    )
  }
}