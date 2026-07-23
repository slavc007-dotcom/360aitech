'use client'

import { useRef, useState } from 'react'
import { useChat } from 'ai/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { IconSpinner } from '@/components/ui/icons'

export interface KnowledgeDocument {
  id: string
  title: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  error_message: string | null
}

interface KnowledgeBaseClientProps {
  orgId: string
  moduleKey: string
  documents: KnowledgeDocument[]
  canManage: boolean
}

export function KnowledgeBaseClient({
  orgId,
  moduleKey,
  documents,
  canManage
}: KnowledgeBaseClientProps) {
  const t = useTranslations('knowledge')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: '/api/kb/chat',
      body: { orgId, module: moduleKey }
    })

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('orgId', orgId)
    formData.append('module', moduleKey)

    const res = await fetch('/api/kb/upload', {
      method: 'POST',
      body: formData
    })

    setIsUploading(false)

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      toast.error(body?.error ?? 'Upload failed')
      return
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-6">
        {canManage ? (
          <div>
            <h2 className="mb-3 text-lg font-semibold">
              {t('uploadHeading')}
            </h2>
            <form
              onSubmit={handleUpload}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                required
                className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
              />
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <IconSpinner className="animate-spin" />
                ) : (
                  t('uploadButton')
                )}
              </Button>
            </form>
          </div>
        ) : null}

        <div>
          <h2 className="mb-3 text-lg font-semibold">
            {t('documentsHeading')}
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('noDocuments')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {documents.map(doc => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  title={doc.error_message ?? undefined}
                >
                  <span className="truncate">{doc.title}</span>
                  <span className="text-xs text-zinc-500">
                    {t(`status${capitalize(doc.status)}` as any)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex h-[500px] flex-col rounded-md border">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={
                m.role === 'user'
                  ? 'ml-auto max-w-[80%] rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'mr-auto max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm'
              }
            >
              {m.content}
            </div>
          ))}
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t p-3"
        >
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={t('chatPlaceholder')}
            className="w-full rounded-md border bg-zinc-50 px-2 py-[9px] text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <IconSpinner className="animate-spin" /> : t('sendButton')}
          </Button>
        </form>
      </div>
    </div>
  )
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
