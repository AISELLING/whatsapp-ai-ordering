import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type BusinessRole = 'owner' | 'admin' | 'staff'

type BusinessAccessSuccess = {
  ok: true
  user: User
  businessId: string
  role: BusinessRole
}

type BusinessAccessFailure = {
  ok: false
  response: NextResponse
}

export type BusinessAccessResult =
  | BusinessAccessSuccess
  | BusinessAccessFailure

export function unauthorized(message = 'Authentication required') {
  return NextResponse.json(
    { error: true, message },
    { status: 401 }
  )
}

export function forbidden(message = 'You do not have access to this business') {
  return NextResponse.json(
    { error: true, message },
    { status: 403 }
  )
}

export async function requireBusinessAccess(
  req: Request,
  businessId: string | null | undefined
): Promise<BusinessAccessResult> {
  if (!businessId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: true, message: 'business_id required' },
        { status: 400 }
      ),
    }
  }

  const accessToken = getAccessTokenFromRequest(req)

  if (!accessToken) {
    return {
      ok: false,
      response: unauthorized(),
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken)

  if (userError || !user) {
    return {
      ok: false,
      response: unauthorized(),
    }
  }

  const { data: businessUser, error: accessError } = await supabaseAdmin
    .from('business_users')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (accessError || !businessUser) {
    return {
      ok: false,
      response: forbidden(),
    }
  }

  return {
    ok: true,
    user,
    businessId,
    role: businessUser.role as BusinessRole,
  }
}

function getAccessTokenFromRequest(req: Request) {
  const authorization = req.headers.get('authorization')

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  const cookies = parseCookies(req.headers.get('cookie') || '')
  const directCookieToken = cookies['sb-access-token']

  if (directCookieToken) {
    return directCookieToken
  }

  for (const [name, value] of Object.entries(cookies)) {
    if (!name.startsWith('sb-') || !name.endsWith('-auth-token')) continue

    const token = getAccessTokenFromSupabaseCookie(value)

    if (token) {
      return token
    }
  }

  return null
}

function parseCookies(cookieHeader: string) {
  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const index = part.indexOf('=')

    if (index === -1) return cookies

    const name = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()

    if (!name) return cookies

    cookies[name] = decodeURIComponent(value)
    return cookies
  }, {})
}

function getAccessTokenFromSupabaseCookie(value: string) {
  try {
    const parsed = JSON.parse(value)

    if (typeof parsed?.access_token === 'string') {
      return parsed.access_token
    }

    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0]
    }
  } catch {
    return null
  }

  return null
}
