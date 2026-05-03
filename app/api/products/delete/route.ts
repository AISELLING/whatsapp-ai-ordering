import { NextResponse } from 'next/server'
import { requireBusinessAccess } from '@/lib/apiSecurity'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const { id, business_id } = await req.json()

    if (!id || !business_id) {
      return NextResponse.json(
        { error: true, message: 'Missing id or business_id' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id)

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}
