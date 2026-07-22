'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  updateMembership,
  type UpdateMembershipResult
} from '@/app/team/actions'
import { MODULES } from '@/lib/modules'
import { IconSpinner } from './ui/icons'

interface MemberRowProps {
  membershipId: string
  label: string
  role: string
  allowedModules: string[]
  canEdit: boolean
}

export function MemberRow({
  membershipId,
  label,
  role,
  allowedModules,
  canEdit
}: MemberRowProps) {
  const [editing, setEditing] = useState(false)
  const [result, dispatch] = useFormState<
    UpdateMembershipResult | undefined,
    FormData
  >(updateMembership, undefined)

  useEffect(() => {
    if (!result) return
    if (result.type === 'error') {
      toast.error(result.message)
    } else {
      toast.success(result.message)
      setEditing(false)
    }
  }, [result])

  return (
    <li className="rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{role}</span>
          {canEdit ? (
            <button
              type="button"
              className="text-xs underline text-zinc-500"
              onClick={() => setEditing(v => !v)}
            >
              {editing ? 'Prekliči' : 'Uredi'}
            </button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form action={dispatch} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="membershipId" value={membershipId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Vloga
            </label>
            <select
              className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
              name="role"
              defaultValue={role}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Dostop do modulov (velja za vlogo User)
            </label>
            <div className="flex flex-col gap-1">
              {MODULES.map(m => (
                <label key={m.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="allowedModules"
                    value={m.key}
                    defaultChecked={allowedModules.includes(m.key)}
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <SaveButton />
        </form>
      ) : null}
    </li>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="flex h-9 w-full flex-row items-center justify-center rounded-md bg-zinc-900 p-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-disabled={pending}
    >
      {pending ? <IconSpinner className="animate-spin" /> : 'Shrani'}
    </button>
  )
}
