import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_360AItechSUPABASE_URL!,
    process.env.NEXT_PUBLIC_360AItechSUPABASE_ANON_KEY!
  )
}
