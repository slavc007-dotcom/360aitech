import { getTranslations } from 'next-intl/server'
import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'
import { getMissingKeys } from '@/app/actions'
import { getCurrentMembership, hasModuleAccess } from '@/lib/auth/permissions'

export const metadata = {
  title: 'Next.js AI Chatbot'
}

export default async function IndexPage() {
  const id = nanoid()
  const session = (await auth()) as Session
  const missingKeys = await getMissingKeys()

  if (session) {
    const membership = await getCurrentMembership()
    if (!hasModuleAccess(membership, 'chat')) {
      const t = await getTranslations('chatAccess')
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-zinc-500">{t('message')}</p>
        </div>
      )
    }
  }

  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <Chat id={id} session={session} missingKeys={missingKeys} />
    </AI>
  )
}
