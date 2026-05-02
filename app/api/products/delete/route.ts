import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  const { id } = await req.json()

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}