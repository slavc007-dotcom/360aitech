'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { authenticate } from '@/app/[locale]/login/actions'
import { Link } from '@/i18n/navigation'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { IconSpinner } from './ui/icons'
import { GoogleAuthButton } from './google-auth-button'

export default function LoginForm() {
  const t = useTranslations('auth')
  const [result, dispatch] = useFormState(authenticate, undefined)

  useEffect(() => {
    if (result) {
      if (result.type === 'error') {
        toast.error(result.message)
      } else {
        toast.success(result.message)
      }
    }
  }, [result])

  return (
    <form
      action={dispatch}
      className="flex flex-col items-center gap-4 space-y-3"
    >
      <div className="w-full flex-1 rounded-lg border bg-white px-6 pb-4 pt-8 shadow-md  dark:bg-zinc-950 md:w-96">
        <h1 className="mb-3 text-2xl font-bold">{t('loginTitle')}</h1>
        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-zinc-400"
              htmlFor="email"
            >
              {t('emailLabel')}
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                id="email"
                type="email"
                name="email"
                placeholder={t('emailPlaceholder')}
                required
              />
            </div>
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-zinc-400"
              htmlFor="password"
            >
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
                id="password"
                type="password"
                name="password"
                placeholder={t('passwordPlaceholder')}
                required
                minLength={6}
              />
            </div>
          </div>
        </div>
        <LoginButton />
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-500 dark:bg-zinc-950">
              {t('orDivider')}
            </span>
          </div>
        </div>
        <GoogleAuthButton />
      </div>

      <Link
        href="/signup"
        className="flex flex-row gap-1 text-sm text-zinc-400"
      >
        {t('noAccountYet')}{' '}
        <div className="font-semibold underline">{t('signUpLink')}</div>
      </Link>
    </form>
  )
}

function LoginButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth')

  return (
    <button
      className="flex flex-row justify-center items-center my-4 h-10 w-full rounded-md bg-zinc-900 p-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      aria-disabled={pending}
    >
      {pending ? <IconSpinner /> : t('loginButton')}
    </button>
  )
}
