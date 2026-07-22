import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/invite-form'
import { MemberRow } from '@/components/member-row'

export const metadata = {
  title: 'Team'
}

export default async function TeamPage() {
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) {
    redirect('/')
  }

  const { data: members } = await supabase
    .from('memberships')
    .select('id, role, allowed_modules, profiles(email, full_name)')
    .eq('org_id', membership.org_id)

  const isAdmin = membership.role === 'admin'

  return (
    <main className="flex flex-col gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold">
          {(membership.organizations as any)?.name ?? 'Organizacija'}
        </h1>
        <p className="text-sm text-zinc-500">Vaša vloga: {membership.role}</p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Člani</h2>
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

      {isAdmin ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Povabi sodelavca</h2>
          <InviteForm orgId={membership.org_id} />
        </div>
      ) : null}
    </main>
  )
}
