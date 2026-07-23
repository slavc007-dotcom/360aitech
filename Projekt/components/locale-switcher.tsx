'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  sl: 'Slovenščina',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español'
}

export function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <select
      aria-label="Language"
      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
      value={locale}
      onChange={e => {
        router.replace(pathname, { locale: e.target.value })
      }}
    >
      {routing.locales.map(l => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  )
}
