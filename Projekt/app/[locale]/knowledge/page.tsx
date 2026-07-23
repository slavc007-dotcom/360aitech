import { getLocale, getTranslations } from 'next-intl/server'
import { redirect, Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { KNOWLEDGE_MODULE_KEYS } from '@/lib/modules'

export default async function KnowledgeIndexPage() {
  const locale = await getLocale()
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: '/login', locale })
    return
  }

  const t = await getTranslations('modules')
  const tCommon = await getTranslations('common')

  return (
    <main className="flex flex-col gap-4 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{tCommon('knowledgeBase')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {KNOWLEDGE_MODULE_KEYS.map(module => (
          <Link
            key={module}
            href={`/knowledge/${module}`}
            className="rounded-lg border p-4 text-sm font-medium hover:bg-muted/50"
          >
            {t(module)}
          </Link>
        ))}
      </div>
    </main>
  )
}
