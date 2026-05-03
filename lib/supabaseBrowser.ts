import { createClient } from '@supabase/supabase-js'

let supabaseBrowserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey)

  return supabaseBrowserClient
}

export async function getSupabaseAccessToken() {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session?.access_token || null
}

export async function getAuthHeaders() {
  const accessToken = await getSupabaseAccessToken()

  if (!accessToken) {
    return null
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}
