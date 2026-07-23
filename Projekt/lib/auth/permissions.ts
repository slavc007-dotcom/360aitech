import { createClient } from '@/lib/supabase/server'
import type { ModuleKey } from '@/lib/modules'

export type MembershipRole = 'admin' | 'vodja' | 'user'

export interface CurrentMembership {
  id: string
  orgId: string
  role: MembershipRole
  allowedModules: string[]
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from('memberships')
    .select('id, org_id, role, allowed_modules')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    orgId: data.org_id,
    role: data.role,
    allowedModules: data.allowed_modules ?? []
  }
}

export function hasModuleAccess(
  membership: CurrentMembership | null,
  moduleKey: ModuleKey
) {
  if (!membership) return false
  if (membership.role === 'admin' || membership.role === 'vodja') return true
  return membership.allowedModules.includes(moduleKey)
}

export function canManageKnowledgeBase(membership: CurrentMembership | null) {
  if (!membership) return false
  return membership.role === 'admin' || membership.role === 'vodja'
}

export async function isSuperAdmin(): Promise<boolean> {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return Boolean(data)
}
