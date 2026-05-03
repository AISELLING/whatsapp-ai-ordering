import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json({
      error: true,
      message: 'business_id required',
    })
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: true, message: error.message })
  }

  return NextResponse.json({
    success: true,
    orders: data || [],
  })
}