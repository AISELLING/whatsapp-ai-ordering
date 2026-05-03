import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_EMAIL = 'daman@idistro.co.uk'

type LatestUser = {
  id: string
  email: string
  created_at?: string
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

async function listAllUsers() {
  const users: User[] = []
  const perPage = 1000
  let page = 1

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    users.push(...data.users)

    if (data.users.length < perPage) {
      break
    }

    page += 1
  }

  return users
}

export async function GET(req: Request) {
  try {
    const user = await getLoggedInUser(req)

    if (!user) {
      return NextResponse.json(
        { error: true, message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: true, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const [users, businessesCountResult, ordersCountResult, latestBusinessesResult] =
      await Promise.all([
        listAllUsers(),
        supabaseAdmin
          .from('businesses')
          .select('*', { count: 'exact', head: true }),
        supabaseAdmin
          .from('orders')
          .select('*', { count: 'exact', head: true }),
        supabaseAdmin
          .from('businesses')
          .select('id, name, slug, business_type, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

    if (businessesCountResult.error) {
      throw businessesCountResult.error
    }

    if (ordersCountResult.error) {
      throw ordersCountResult.error
    }

    if (latestBusinessesResult.error) {
      throw latestBusinessesResult.error
    }

    const latestUsers: LatestUser[] = users
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime()
        const bTime = new Date(b.created_at || 0).getTime()
        return bTime - aTime
      })
      .slice(0, 10)
      .map((latestUser) => ({
        id: latestUser.id,
        email: latestUser.email || '',
        created_at: latestUser.created_at,
      }))

    return NextResponse.json({
      success: true,
      totals: {
        users: users.length,
        businesses: businessesCountResult.count || 0,
        orders: ordersCountResult.count || 0,
      },
      latestUsers,
      latestBusinesses: latestBusinessesResult.data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error.message || 'Failed to load admin overview',
      },
      { status: 500 }
    )
  }
}
