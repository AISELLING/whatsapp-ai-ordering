import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { business_id, products } = body

    if (!business_id) {
      return NextResponse.json(
        { error: true, message: 'business_id required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(products)) {
      return NextResponse.json(
        { error: true, message: 'products must be an array' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const cleanProducts = products.map((p: any) => ({
      name: p.name,
      price: p.price,
      business_id,
    }))

    const { error } = await supabaseAdmin
      .from('products')
      .insert(cleanProducts)

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to import menu' },
      { status: 500 }
    )
  }
}
