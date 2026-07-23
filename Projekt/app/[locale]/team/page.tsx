import { getTranslations, getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/invite-form'
import { MemberRow } from '@/components/member-row'

export const metadata = {
  title: 'Team'
}

export default async function TeamPage() {
  const supabase = createClient()
  const locale = await getLocale()
  const t = await getTranslations('team')
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: '/login', locale })
    return
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect({ href: '/', locale })
    return
  }

  const { data: members } = await supabase
    .from('memberships')
    .select('id, role, allowed_modules, profiles(email, full_name)')
    .eq('org_id', membership.org_id)

  const isAdmin = membership.role === 'admin'
  const isVodja = membership.role === 'vodja'
  const canInvite = isAdmin || isVodja

  return (
    <main className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">
          {(membership.organizations as any)?.name ?? 'Organizacija'}
        </h1>
        <p className="text-sm text-zinc-500">
          {isAdmin
            ? t('yourRoleAdmin')
            : isVodja
              ? t('yourRoleVodja')
              : t('yourRoleUser')}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('membersHeading')}</h2>
        <ul className="flex flex-col gap-2">
          {members?.map(m => (
            <MemberRow
              key={m.id}
              membershipId={m.id}
              label={
                (m.profiles as any)?.full_name || (m.profiles as any)?.email
              }
              role={m.role}
              allowedModules={m.allowed_modules ?? []}
              canEdit={isAdmin}
            />
          ))}
        </ul>
      </div>

      {canInvite ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('inviteHeading')}</h2>
          <InviteForm orgId={membership.org_id} canAssignAnyRole={isAdmin} />
        </div>
      ) : null}
    </main>
  )
}
