'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export type InviteResult =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string; link: string }

export async function createInvite(
  _prevState: InviteResult | undefined,
  formData: FormData
): Promise<InviteResult> {
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(['admin', 'user']),
      orgId: z.string().uuid()
    })
    .safeParse({
      email: formData.get('email'),
      role: formData.get('role'),
      orgId: formData.get('orgId')
    })

  if (!parsed.success) {
    return { type: 'error', message: 'Invalid entries, please try again!' }
  }

  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return { type: 'error', message: 'Unauthorized' }
  }

  const { data: invite, error } = await supabase
    .from('org_invites')
    .insert({
      org_id: parsed.data.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invited_by: user.id
    })
    .select('token')
    .single()

  if (error || !invite) {
    return {
      type: 'error',
      message: 'Only organization admins can invite new members.'
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const link = `${siteUrl}/signup?invite=${invite.token}`

  revalidatePath('/team')

  return { type: 'success', message: 'Invite created!', link }
}
