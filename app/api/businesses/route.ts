import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    { error: true, message },
    { status: 401 }
  )
}

async function getLoggedInUser(req: Request): Promise<User | null> {
  const authorization = req.headers.get('authorization')

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  const accessToken = authorization.slice('bearer '.length).trim()

  if (!accessToken) {
    return null
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken)

  if (error || !user) {
    return null
  }

  return user
}

export async function GET(req: Request) {
  try {
    const user = await getLoggedInUser(req)

    if (!user) {
      return unauthorized()
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('business_users')
      .select('business_id')
      .eq('user_id', user.id)

    if (membershipError) {
      return NextResponse.json(
        { error: true, message: membershipError.message },
        { status: 500 }
      )
    }

    const businessIds = (memberships || [])
      .map((membership) => membership.business_id)
      .filter(Boolean)

    if (businessIds.length === 0) {
      return NextResponse.json({
        success: true,
        businesses: [],
      })
    }

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .in('id', businessIds)
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
    const user = await getLoggedInUser(req)

    if (!user) {
      return unauthorized()
    }

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

    const { error: ownerError } = await supabaseAdmin
      .from('business_users')
      .insert({
        business_id: business.id,
        user_id: user.id,
        role: 'owner',
      })

    if (ownerError) {
      await supabaseAdmin
        .from('businesses')
        .delete()
        .eq('id', business.id)

      return NextResponse.json(
        { error: true, message: ownerError.message },
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
