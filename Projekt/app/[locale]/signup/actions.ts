'use server'

import { createClient } from '@/lib/supabase/server'
import { ensureOrgMembership } from '@/lib/auth/ensure-membership'
import { AuthResult } from '@/lib/types'
import { z } from 'zod'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export async function signup(
  _prevState: AuthResult | undefined,
  formData: FormData
) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const inviteToken = (formData.get('inviteToken') as string) || null

  const parsedCredentials = z
    .object({
      email: z.string().email(),
      password: z.string().min(6)
    })
    .safeParse({ email, password })

  if (!parsedCredentials.success) {
    return { type: 'error', message: 'Invalid entries, please try again!' }
  }

  const locale = await getLocale()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const emailRedirectTo = new URL('/auth/callback', siteUrl)
  emailRedirectTo.searchParams.set('next', `/${locale}`)
  if (inviteToken) {
    emailRedirectTo.searchParams.set('invite', inviteToken)
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: emailRedirectTo.toString() }
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return {
        type: 'error',
        message: 'User already exists! Please log in.'
      }
    }
    return {
      type: 'error',
      message: 'Something went wrong! Please try again.'
    }
  }

  // Če je potrditev emaila izklopljena, je uporabnik takoj prijavljen
  // in lahko že zdaj ustvarimo organizacijo/pridružitev.
  if (data.session) {
    await ensureOrgMembership(inviteToken)
    redirect({ href: '/', locale })
  }

  return {
    type: 'success',
    message: 'Preverite svoj email in potrdite račun, da dokončate registracijo.'
  }
}
