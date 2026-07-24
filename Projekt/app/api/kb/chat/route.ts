import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AnthropicStream, GoogleGenerativeAIStream, StreamingTextResponse } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { isKnowledgeModule } from '@/lib/modules'
import { embedText } from '@/lib/kb/embeddings'

export const runtime = 'nodejs'

interface ChatMessage {
  role: string
  content: string
}

async function streamWithClaude(systemPrompt: string, messages: ChatMessage[]) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 1024,
    system: systemPrompt,
    stream: true,
    messages: messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
  })

  // `ai@3` typet AnthropicStream proti starejši @anthropic-ai/sdk verziji;
  // nameščena novejša verzija ima strukturno enak, a nominalno drugačen
  // event-tip (RawMessageStreamEvent). Runtime shape je enak.
  return AnthropicStream(response as any)
}

async function streamWithGemini(systemPrompt: string, messages: ChatMessage[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt
  })

  const result = await model.generateContentStream({
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  })

  return GoogleGenerativeAIStream(result)
}

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

  // Primarno Claude (po claude.md); dokler ANTHROPIC_API_KEY ni nastavljen,
  // se za testiranje uporabi Gemini (isti ključ kot za embeddinge).
  const stream = process.env.ANTHROPIC_API_KEY
    ? await streamWithClaude(systemPrompt, messages)
    : await streamWithGemini(systemPrompt, messages)

  return new StreamingTextResponse(stream)
}
