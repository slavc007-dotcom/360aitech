'use server'

import { createClient } from '@/lib/supabase/server'
import { AuthResult } from '@/lib/types'
import { z } from 'zod'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export async function authenticate(
  _prevState: AuthResult | undefined,
  formData: FormData
) {
  const email = formData.get('email')
  const password = formData.get('password')

  const parsedCredentials = z
    .object({
      email: z.string().email(),
      password: z.string().min(6)
    })
    .safeParse({ email, password })

  if (!parsedCredentials.success) {
    return { type: 'error', message: 'Invalid credentials!' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(
    parsedCredentials.data
  )

  if (error) {
    return { type: 'error', message: 'Invalid credentials!' }
  }

  const locale = await getLocale()
  redirect({ href: '/', locale })
}
