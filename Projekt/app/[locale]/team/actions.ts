'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getLocale, getTranslations } from 'next-intl/server'
import { MODULE_KEYS } from '@/lib/modules'
import { routing } from '@/i18n/routing'
import { sendInviteEmail } from '@/lib/email/send-invite'

export type InviteResult =
  | { type: 'error'; message: string }
  | { type: 'success'; message: string; link: string; emailSent: boolean }

const moduleKeysSchema = z.array(z.enum([...MODULE_KEYS])).default([])

function revalidateTeamPage() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/team`)
  }
}

export async function createInvite(
  _prevState: InviteResult | undefined,
  formData: FormData
): Promise<InviteResult> {
  const parsed = z
    .object({
      email: z.string().email(),
      role: z.enum(['admin', 'vodja', 'user']),
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

  const { data: callerMembership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', parsed.data.orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    callerMembership?.role === 'vodja' &&
    parsed.data.role !== 'user'
  ) {
    return {
      type: 'error',
      message: 'Vodja can only invite members with the User role.'
    }
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
    .select('token, organizations(name)')
    .single()

  if (error || !invite) {
    return {
      type: 'error',
      message: 'Only organization admins can invite new members.'
    }
  }

  const locale = await getLocale()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const link = `${siteUrl}/${locale}/signup?invite=${invite.token}`
  const orgName = (invite.organizations as any)?.name ?? '360AITech'

  const t = await getTranslations('inviteEmail')
  const { sent } = await sendInviteEmail({
    to: parsed.data.email,
    subject: t('subject', { org: orgName }),
    heading: t('heading'),
    body: t('body', { org: orgName }),
    buttonLabel: t('button'),
    ignoreLabel: t('ignore'),
    link
  })

  revalidateTeamPage()

  return {
    type: 'success',
    message: sent
      ? 'Invite email sent!'
      : "Invite created, but the email couldn't be sent - copy the link below.",
    link,
    emailSent: sent
  }
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
      role: z.enum(['admin', 'vodja', 'user']),
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

  revalidateTeamPage()

  return { type: 'success', message: 'Member updated!' }
}
