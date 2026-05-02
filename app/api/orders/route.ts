import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
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