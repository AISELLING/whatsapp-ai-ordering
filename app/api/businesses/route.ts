import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
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
      businesses: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to load businesses',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.name) {
      return NextResponse.json(
        { error: true, message: 'Business name is required' },
        { status: 400 }
      )
    }

    const baseSlug = slugify(body.name)
    const slug = `${baseSlug}-${Date.now().toString().slice(-5)}`

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: body.name,
        slug,
        business_type: body.business_type || 'restaurant',
        phone: body.phone || '',
        whatsapp_number: body.whatsapp_number || '',
        email: body.email || '',
        currency: 'GBP',
        timezone: 'Europe/London',
        is_active: true,
      })
      .select()
      .single()

    if (businessError) {
      return NextResponse.json(
        { error: true, message: businessError.message },
        { status: 500 }
      )
    }

    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({
        business_id: business.id,
        name: 'Main Branch',
        address: body.address || '',
        postcode: body.postcode || '',
        phone: body.phone || '',
        is_active: true,
      })
      .select()
      .single()

    if (branchError) {
      return NextResponse.json(
        { error: true, message: branchError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Business created successfully',
      business,
      branch,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to create business',
      },
      { status: 500 }
    )
  }
}