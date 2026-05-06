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
    .from('bookings')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: true, message: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    bookings: data || [],
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      business_id,
      customer_phone,
      customer_name,
      service,
      dog_breed,
      dog_size,
      requested_date,
      requested_time,
      notes,
      status,
    } = body

    if (!business_id) {
      return NextResponse.json(
        { error: true, message: 'business_id required' },
        { status: 400 }
      )
    }

    const access = await requireBusinessAccess(req, business_id)

    if (!access.ok) {
      return access.response
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        business_id,
        customer_phone: customer_phone || '',
        customer_name: customer_name || '',
        service: service || '',
        dog_breed: dog_breed || '',
        dog_size: dog_size || '',
        requested_date: requested_date || '',
        requested_time: requested_time || '',
        notes: notes || '',
        status: status || 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: true, message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      booking: data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to create booking' },
      { status: 500 }
    )
  }
}
