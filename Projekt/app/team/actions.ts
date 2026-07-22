'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { MODULE_KEYS } from '@/lib/modules'

export type InviteResult =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string; link: string }

const moduleKeysSchema = z
  .array(z.enum(MODULE_KEYS as [string, ...string[]]))
  .default([])

export async function createInvite(
  _prevState: InviteResult | undefined,
  formData: FormData
): Promise<InviteResult> {
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(['admin', 'user']),
      orgId: z.string().uuid(),
      allowedModules: moduleKeysSchema
    })
    .safeParse({
      email: formData.get('email'),
      role: formData.get('role'),
      orgId: formData.get('orgId'),
      allowedModules: formData.getAll('allowedModules')
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
      allowed_modules: parsed.data.allowedModules,
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

export type UpdateMembershipResult =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string }

export async function updateMembership(
  _prevState: UpdateMembershipResult | undefined,
  formData: FormData
): Promise<UpdateMembershipResult> {
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      role: z.enum(['admin', 'user']),
      allowedModules: moduleKeysSchema
    })
    .safeParse({
      membershipId: formData.get('membershipId'),
      role: formData.get('role'),
      allowedModules: formData.getAll('allowedModules')
    })

  if (!parsed.success) {
    return { type: 'error', message: 'Invalid entries, please try again!' }
  }

  const supabase = createClient()
  const { error } = await supabase
    .from('memberships')
    .update({
      role: parsed.data.role,
      allowed_modules: parsed.data.allowedModules
    })
    .eq('id', parsed.data.membershipId)

  if (error) {
    return {
      type: 'error',
      message: 'Only organization admins can edit members.'
    }
  }

  revalidatePath('/team')

  return { type: 'success', message: 'Member updated!' }
}
