import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json()

  const { business_id, products } = body

  if (!business_id) {
    return NextResponse.json({ error: true, message: 'business_id required' })
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
    return NextResponse.json({ error: true, message: error.message })
  }

  return NextResponse.json({ success: true })
}