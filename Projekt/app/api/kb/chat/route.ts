import OpenAI from 'openai'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { isKnowledgeModule } from '@/lib/modules'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { messages, orgId, module: moduleKey } = await req.json()

  if (typeof orgId !== 'string' || !isKnowledgeModule(moduleKey)) {
    return new Response('Invalid request', { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return new Response('Forbidden', { status: 403 })
  }

  const lastMessage = messages[messages.length - 1]?.content ?? ''

  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: lastMessage
  })

  const { data: chunks } = await supabase.rpc('match_kb_chunks', {
    query_embedding: embeddingRes.data[0].embedding,
    match_org_id: orgId,
    match_module: moduleKey,
    match_count: 6
  })

  const context =
    (chunks ?? []).map((c: { content: string }) => c.content).join('\n---\n') ||
    '(No matching documents found.)'

  const systemMessage = {
    role: 'system' as const,
    content: `You are an internal assistant answering questions using the company's own documents. Answer only using the context below. If the answer isn't in the context, say you don't know rather than guessing.\n\nContext:\n${context}`
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [systemMessage, ...messages]
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
