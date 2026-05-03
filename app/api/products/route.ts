import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json(
      { error: true, message: 'business_id required' },
      { status: 400 }
    )
  }

  const access = await requireBusinessAccess(req, businessId)

  if (!access.ok) {
    return access.response
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('business_id', businessId)

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    products: data || [],
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_id, name, description, price, category } = body

    if (!business_id || !name || !price) {
      return NextResponse.json(
        { error: true, message: 'Missing business_id, name, or price' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        business_id,
        name,
        description: description || '',
        price,
        category: category || '',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      product: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
