import { notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCurrentMembership,
  hasModuleAccess,
  canManageKnowledgeBase
} from '@/lib/auth/permissions'
import { isKnowledgeModule, KNOWLEDGE_MODULE_KEYS } from '@/lib/modules'
import { KnowledgeBaseClient } from '@/components/knowledge-base-client'

interface KnowledgePageProps {
  params: Promise<{ module: string }>
}

export function generateStaticParams() {
  return KNOWLEDGE_MODULE_KEYS.map(module => ({ module }))
}

export default async function KnowledgePage({ params }: KnowledgePageProps) {
  const { module: moduleParam } = await params

  if (!isKnowledgeModule(moduleParam)) {
    notFound()
  }

  const locale = await getLocale()
  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: '/login', locale })
    return
  }

  const membership = await getCurrentMembership()
  const tModules = await getTranslations('modules')
  const tKnowledge = await getTranslations('knowledge')

  if (!hasModuleAccess(membership, moduleParam)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">
          {tKnowledge('noAccessTitle')}
        </h1>
        <p className="text-sm text-zinc-500">
          {tKnowledge('noAccessMessage')}
        </p>
      </div>
    )
  }

  const { data: documents } = await supabase
    .from('kb_documents')
    .select('id, title, status, error_message')
    .eq('org_id', membership!.orgId)
    .eq('module', moduleParam)
    .order('created_at', { ascending: false })

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{tModules(moduleParam)}</h1>
      <KnowledgeBaseClient
        orgId={membership!.orgId}
        moduleKey={moduleParam}
        documents={documents ?? []}
        canManage={canManageKnowledgeBase(membership)}
      />
    </main>
  )
}
