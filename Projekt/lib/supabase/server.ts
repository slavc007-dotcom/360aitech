import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_360AItechSUPABASE_URL!,
    process.env.NEXT_PUBLIC_360AItechSUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Klicano iz Server Component-a, kjer pisanje cookiejev ni mogoče -
            // middleware poskrbi za osvežitev seje.
          }
        }
      }
    }
  )
}
