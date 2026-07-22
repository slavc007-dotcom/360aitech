'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createInvite, type InviteResult } from '@/app/team/actions'
import { IconSpinner } from './ui/icons'
import { MODULES } from '@/lib/modules'

export function InviteForm({ orgId }: { orgId: string }) {
  const [result, dispatch] = useFormState<InviteResult | undefined, FormData>(
    createInvite,
    undefined
  )
  const [link, setLink] = useState<string | null>(null)

  useEffect(() => {
    if (!result) return
    if (result.type === 'error') {
      toast.error(result.message)
    } else {
      toast.success(result.message)
      setLink(result.link)
    }
  }, [result])

  return (
    <div className="w-full max-w-md">
      <form action={dispatch} className="flex flex-col gap-3">
        <input type="hidden" name="orgId" value={orgId} />
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Email sodelavca
          </label>
          <input
            className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            type="email"
            name="email"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Vloga
          </label>
          <select
            className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            name="role"
            defaultValue="user"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Dostop do modulov (velja za vlogo User; Admin ima dostop do vsega)
          </label>
          <div className="flex flex-col gap-1">
            {MODULES.map(m => (
              <label key={m.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowedModules" value={m.key} />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <InviteButton />
      </form>
      {link ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            Povabilna povezava (pošljite jo sodelavcu)
          </label>
          <input
            readOnly
            className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            value={link}
            onFocus={e => e.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  )
}

function InviteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="flex h-10 w-full flex-row items-center justify-center rounded-md bg-zinc-900 p-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-disabled={pending}
    >
      {pending ? <IconSpinner className="animate-spin" /> : 'Ustvari povabilo'}
    </button>
  )
}
