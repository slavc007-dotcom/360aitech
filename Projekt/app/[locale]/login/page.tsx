import { auth } from '@/auth'
import LoginForm from '@/components/login-form'
import { Session } from '@/lib/types'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export default async function LoginPage() {
  const session = (await auth()) as Session

  if (session) {
    redirect({ href: '/', locale: await getLocale() })
  }

  return (
    <main className="flex flex-col p-4">
      <LoginForm />
    </main>
  )
}
