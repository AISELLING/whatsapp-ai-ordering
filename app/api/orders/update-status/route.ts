import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const body = await req.json()

  const { id, order_status } = body

  if (!id || !order_status) {
    return NextResponse.json(
      { error: true, message: 'Missing id or order_status' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ order_status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: true, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, order: data })
}