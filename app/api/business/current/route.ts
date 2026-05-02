import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    const { data: business, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('slug', 'demo-food-shop')
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      business,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to load business' },
      { status: 500 }
    )
  }
}