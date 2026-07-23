import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

function stripLocalePrefix(pathname: string) {
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`)
  const stripped = pathname.replace(localePattern, '')
  return stripped === '' ? '/' : stripped
}

export async function updateSession(
  request: NextRequest,
  baseResponse: NextResponse
) {
  let response = baseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_360AItechSUPABASE_URL!,
    process.env.NEXT_PUBLIC_360AItechSUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const pathname = stripLocalePrefix(request.nextUrl.pathname)
  const isOnAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/signup')

  if (user && isOnAuthPage) {
    const locale = request.nextUrl.pathname.split('/')[1]
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  return response
}
