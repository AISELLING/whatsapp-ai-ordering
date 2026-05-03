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
