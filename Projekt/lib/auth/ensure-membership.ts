import { createClient } from '@/lib/supabase/server'

/**
 * Poklicano po vsaki uspešni prijavi/registraciji (password, Google OAuth,
 * potrditev emaila). Če prijavljeni uporabnik še nima nobenega članstva,
 * ga bodisi pridruži organizaciji iz povabila, bodisi mu ustvari novo
 * organizacijo kot admin (samostojna registracija).
 */
export async function ensureOrgMembership(inviteToken?: string | null) {
  const supabase = createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: existingMemberships } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existingMemberships && existingMemberships.length > 0) {
    return
  }

  if (inviteToken) {
    await supabase.rpc('accept_org_invite', { p_token: inviteToken })
    return
  }

  const domain = user.email?.split('@')[1] ?? 'moje-podjetje'
  await supabase.rpc('create_organization_with_admin', {
    org_name: `Organizacija ${domain}`
  })
}
