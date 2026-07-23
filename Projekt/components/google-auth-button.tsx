'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = React.useState(false)
  const locale = useLocale()
  const t = useTranslations('auth')

  async function handleClick() {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}`
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? <IconSpinner className="mr-2 animate-spin" /> : null}
      {t('continueWithGoogle')}
    </Button>
  )
}
