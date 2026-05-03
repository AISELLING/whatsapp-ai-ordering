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
    .order('category', { ascending: true })
    .order('name', { ascending: true })

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
    const { business_id, name, description, price, category, is_available } = body

    if (!business_id || !name || price === undefined || price === '') {
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
        price: Number(price),
        category: category || '',
        is_available: is_available !== false,
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

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const {
      id,
      business_id,
      name,
      description,
      price,
      category,
      is_available,
    } = body

    if (!id || !business_id || !name || price === undefined || price === '') {
      return NextResponse.json(
        { error: true, message: 'Missing id, business_id, name, or price' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        name,
        description: description || '',
        price: Number(price),
        category: category || '',
        is_available: Boolean(is_available),
      })
      .eq('id', id)
      .eq('business_id', business_id)
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
      { error: true, message: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}
