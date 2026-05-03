import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('business_id', businessId)

  if (error) {
    return NextResponse.json({ error: true, message: error.message })
  }

  return NextResponse.json({
    success: true,
    products: data || [],
  })
}