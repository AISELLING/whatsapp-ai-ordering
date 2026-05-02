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
      .from('orders')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      orders: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}