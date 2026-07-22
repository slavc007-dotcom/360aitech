import { createClient } from '@/lib/supabase/server'
import type { Session } from '@/lib/types'

export async function auth(): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return null
  }

  return { user: { id: user.id, email: user.email } }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
