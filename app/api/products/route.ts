import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ products: data })
}

export async function POST(req: Request) {
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
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
}