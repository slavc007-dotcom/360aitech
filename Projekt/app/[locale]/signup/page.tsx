import { Suspense } from 'react'
import { auth } from '@/auth'
import SignupForm from '@/components/signup-form'
import { Session } from '@/lib/types'
import { getLocale } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'

export default async function SignupPage() {
  const session = (await auth()) as Session

  if (session) {
    redirect({ href: '/', locale: await getLocale() })
  }

  return (
    <main className="flex flex-col p-4">
      <Suspense>
        <SignupForm />
      </Suspense>
    </main>
  )
}
