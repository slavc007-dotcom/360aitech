import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'sl', 'de', 'fr', 'es'],
  defaultLocale: 'en',
  localePrefix: 'always'
})
