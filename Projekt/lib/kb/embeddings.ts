import { GoogleGenerativeAI } from '@google/generative-ai'

const EMBEDDING_MODEL = 'text-embedding-004'

export async function embedText(text: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })
  const result = await model.embedContent(text)
  return result.embedding.values
}
