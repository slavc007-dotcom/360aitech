import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'
import { getMissingKeys } from '../actions'
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
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <h1 className="text-xl font-semibold">Ni dostopa do tega modula</h1>
          <p className="text-sm text-zinc-500">
            Za AI Chat nimate dovoljenja. Kontaktirajte administratorja
            organizacije, da vam odobri dostop na strani Team.
          </p>
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
