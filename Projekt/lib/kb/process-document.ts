import OpenAI from 'openai'
// Uvoz iz notranje datoteke (ne iz paketnega root-a) obide znan bug v
// pdf-parse@1.1.1, kjer se ob webpack/Next.js bundlanju sproži interni
// "debug mode", ki poskuša prebrati testno fixture datoteko ob importu.
// @ts-expect-error - paket nima tipov za notranjo pot
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import { createClient } from '@/lib/supabase/server'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const CHUNK_SIZE = 1500
const CHUNK_OVERLAP = 200

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length)
    chunks.push(text.slice(start, end))
    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  return chunks.map(c => c.trim()).filter(c => c.length > 0)
}

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const data = await pdf(buffer)
    return data.text
  }

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  return buffer.toString('utf-8')
}

export async function processDocument(documentId: string) {
  const supabase = createClient()

  const { data: doc } = await supabase
    .from('kb_documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (!doc) return

  await supabase
    .from('kb_documents')
    .update({ status: 'processing' })
    .eq('id', documentId)

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.storage_path)

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? 'File not found in storage')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractText(buffer, doc.mime_type ?? '')
    const chunks = chunkText(text)

    if (chunks.length === 0) {
      throw new Error('No extractable text found in document')
    }

    const openai = getOpenAI()

    for (let i = 0; i < chunks.length; i++) {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks[i]
      })

      await supabase.from('kb_chunks').insert({
        document_id: documentId,
        org_id: doc.org_id,
        content: chunks[i],
        embedding: embeddingRes.data[0].embedding,
        chunk_index: i
      })
    }

    await supabase
      .from('kb_documents')
      .update({ status: 'ready' })
      .eq('id', documentId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('kb_documents')
      .update({ status: 'error', error_message: message })
      .eq('id', documentId)
  }
}
