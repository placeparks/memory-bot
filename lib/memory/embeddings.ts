/**
 * Nexus Memory — Embedding Service
 * Uses OpenAI text-embedding-3-small if OPENAI_API_KEY is set.
 * Falls back to null → triggers full-text search fallback in retrieval layer.
 */

let openaiClient: any = null

async function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null
  if (!openaiClient) {
    try {
      const { default: OpenAI } = await import('openai')
      openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    } catch {
      return null
    }
  }
  return openaiClient
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = await getOpenAI()
  if (!client) return null

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    })
    return response.data[0].embedding as number[]
  } catch (err) {
    console.error('[Nexus] Embedding failed:', err)
    return null
  }
}

export function embeddingToSql(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

export const VECTOR_DIMS = 1536
