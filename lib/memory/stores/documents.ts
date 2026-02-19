import { prisma } from '@/lib/prisma'
import { generateEmbedding, embeddingToSql } from '../embeddings'
import { RAGResult } from '../types'

function chunkText(text: string, maxWords = 500, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length)
    chunks.push(words.slice(start, end).join(' '))
    if (end >= words.length) break
    start = end - overlap
  }

  return chunks.filter(c => c.trim().length > 20)
}

export async function storeDocument(
  instanceId: string,
  filename: string,
  contentType: string,
  content: string,
  sizeBytes: number
): Promise<string> {
  const doc = await (prisma as any).knowledgeDocument.create({
    data: {
      instanceId,
      filename,
      contentType,
      content,
      sizeBytes,
      status: 'INDEXING',
    },
  })

  // Index chunks in background
  indexDocumentChunks(doc.id, instanceId, content).catch(err =>
    console.error('[Nexus] Chunk indexing failed:', err)
  )

  return doc.id
}

async function indexDocumentChunks(
  documentId: string,
  instanceId: string,
  content: string
): Promise<void> {
  const chunks = chunkText(content)

  // Delete old chunks first
  await (prisma as any).documentChunk.deleteMany({ where: { documentId } })

  for (let i = 0; i < chunks.length; i++) {
    const chunk = await (prisma as any).documentChunk.create({
      data: { documentId, instanceId, chunkIndex: i, content: chunks[i] },
    })

    const embedding = await generateEmbedding(chunks[i])
    if (embedding) {
      const embStr = embeddingToSql(embedding)
      await prisma.$executeRawUnsafe(
        `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
        embStr,
        chunk.id
      )
    }
  }

  await (prisma as any).knowledgeDocument.update({
    where: { id: documentId },
    data: { status: 'READY', chunkCount: chunks.length },
  })
}

export async function getDocuments(instanceId: string) {
  return (prisma as any).knowledgeDocument.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      contentType: true,
      sizeBytes: true,
      status: true,
      chunkCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function deleteDocument(id: string): Promise<void> {
  await (prisma as any).knowledgeDocument.delete({ where: { id } })
}

export async function ragSearchByVector(
  instanceId: string,
  embeddingStr: string,
  topK = 5
): Promise<RAGResult[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    chunk_id: string
    content: string
    chunk_index: number
    doc_id: string
    filename: string
    similarity: number
  }>>(
    `SELECT dc.id as chunk_id, dc.content, dc.chunk_index,
            kd.id as doc_id, kd.filename,
            1 - (dc.embedding <=> $1::vector) as similarity
     FROM document_chunks dc
     JOIN knowledge_documents kd ON dc.document_id = kd.id
     WHERE kd.instance_id = $2 AND kd.status = 'READY' AND dc.embedding IS NOT NULL
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    instanceId,
    topK
  )

  return rows.map(r => ({
    content: r.content,
    similarity: r.similarity,
    source: { documentId: r.doc_id, filename: r.filename, chunkIndex: r.chunk_index },
  }))
}

export async function ragSearchByText(
  instanceId: string,
  query: string,
  topK = 5
): Promise<RAGResult[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{
    chunk_id: string
    content: string
    chunk_index: number
    doc_id: string
    filename: string
    similarity: number
  }>>(
    `SELECT dc.id as chunk_id, dc.content, dc.chunk_index,
            kd.id as doc_id, kd.filename,
            ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', $1)) as similarity
     FROM document_chunks dc
     JOIN knowledge_documents kd ON dc.document_id = kd.id
     WHERE kd.instance_id = $2 AND kd.status = 'READY'
       AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', $1)
     ORDER BY similarity DESC
     LIMIT $3`,
    query,
    instanceId,
    topK
  )

  return rows.map(r => ({
    content: r.content,
    similarity: r.similarity,
    source: { documentId: r.doc_id, filename: r.filename, chunkIndex: r.chunk_index },
  }))
}

export async function getTotalDocumentsMB(instanceId: string): Promise<number> {
  try {
    const result = await (prisma as any).knowledgeDocument.aggregate({
      where: { instanceId },
      _sum: { sizeBytes: true },
    })
    return ((result._sum?.sizeBytes as number) ?? 0) / (1024 * 1024)
  } catch {
    return 0
  }
}

export async function countDocuments(instanceId: string): Promise<number> {
  return (prisma as any).knowledgeDocument.count({ where: { instanceId } })
}
