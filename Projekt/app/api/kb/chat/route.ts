import Anthropic from '@anthropic-ai/sdk'
import { AnthropicStream, StreamingTextResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { isKnowledgeModule } from '@/lib/modules'
import { embedText } from '@/lib/kb/embeddings'

export const runtime = 'nodejs'

export async function POST(req: Request) {
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
  const queryEmbedding = await embedText(lastMessage)

  const { data: chunks } = await supabase.rpc('match_kb_chunks', {
    query_embedding: queryEmbedding,
    match_org_id: orgId,
    match_module: moduleKey,
    match_count: 6
  })

  const context =
    (chunks ?? []).map((c: { content: string }) => c.content).join('\n---\n') ||
    '(No matching documents found.)'

  const systemPrompt = `You are an internal assistant answering questions using the company's own documents. Answer only using the context below. If the answer isn't in the context, say you don't know rather than guessing.\n\nContext:\n${context}`

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    system: systemPrompt,
    stream: true,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  })

  // `ai@3` typet AnthropicStream proti starejši @anthropic-ai/sdk verziji;
  // nameščena novejša verzija ima strukturno enak, a nominalno drugačen
  // event-tip (RawMessageStreamEvent). Runtime shape je enak.
  const stream = AnthropicStream(response as any)
  return new StreamingTextResponse(stream)
}
