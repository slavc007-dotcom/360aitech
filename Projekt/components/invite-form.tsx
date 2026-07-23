'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createInvite, type InviteResult } from '@/app/[locale]/team/actions'
import { IconSpinner } from './ui/icons'
import { MODULE_KEYS } from '@/lib/modules'

export function InviteForm({ orgId }: { orgId: string }) {
  const t = useTranslations('team')
  const tModules = useTranslations('modules')
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
            {t('inviteEmailLabel')}
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
            {t('roleLabel')}
          </label>
          <select
            className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
            name="role"
            defaultValue="user"
          >
            <option value="user">{t('roleUser')}</option>
            <option value="admin">{t('roleAdmin')}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            {t('modulesLabel')}
          </label>
          <div className="flex flex-col gap-1">
            {MODULE_KEYS.map(key => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allowedModules" value={key} />
                {tModules(key)}
              </label>
            ))}
          </div>
        </div>
        <InviteButton />
      </form>
      {link ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-zinc-400">
            {t('inviteLinkLabel')}
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
  const t = useTranslations('team')

  return (
    <button
      className="flex h-10 w-full flex-row items-center justify-center rounded-md bg-zinc-900 p-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-disabled={pending}
    >
      {pending ? (
        <IconSpinner className="animate-spin" />
      ) : (
        t('createInviteButton')
      )}
    </button>
  )
}
