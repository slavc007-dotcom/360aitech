import { createClient } from '@/lib/supabase/server'
import type { ModuleKey } from '@/lib/modules'

export interface CurrentMembership {
  id: string
  orgId: string
  role: 'admin' | 'user'
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
  if (membership.role === 'admin') return true
  return membership.allowedModules.includes(moduleKey)
}
