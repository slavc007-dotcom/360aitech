import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/invite-form'

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
    .select('id, role, profiles(email, full_name)')
    .eq('org_id', membership.org_id)

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
            <li
              key={m.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {(m.profiles as any)?.full_name || (m.profiles as any)?.email}
              </span>
              <span className="text-xs text-zinc-500">{m.role}</span>
            </li>
          ))}
        </ul>
      </div>

      {membership.role === 'admin' ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Povabi sodelavca</h2>
          <InviteForm orgId={membership.org_id} />
        </div>
      ) : null}
    </main>
  )
}
