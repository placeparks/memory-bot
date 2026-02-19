import { prisma } from '@/lib/prisma'
import { generateEmbedding, embeddingToSql } from '../embeddings'
import { MemoryEventCreate, MemoryEventRow, MemorySearchResult } from '../types'
import { getExpiryDate } from '../tiers'

export async function storeMemoryEvent(
  data: MemoryEventCreate,
  tier: 'STANDARD' | 'PRO' = 'STANDARD'
): Promise<string> {
  const expiresAt = getExpiryDate(tier)

  const event = await (prisma as any).memoryEvent.create({
    data: {
      instanceId: data.instanceId,
      sessionId: data.sessionId,
      eventType: data.eventType,
      channel: data.channel,
      senderId: data.senderId,
      content: data.content,
      summary: data.summary,
      importance: data.importance ?? 0.5,
      expiresAt: expiresAt ?? undefined,
      metadata: data.metadata ?? undefined,
    },
  })

  // Generate embedding and store via raw SQL (pgvector)
  const text = data.summary || data.content
  const embedding = await generateEmbedding(text)
  if (embedding) {
    const embStr = embeddingToSql(embedding)
    await prisma.$executeRawUnsafe(
      `UPDATE memory_events SET embedding = $1::vector WHERE id = $2`,
      embStr,
      event.id
    )
  }

  return event.id
}

export async function getRecentEvents(
  instanceId: string,
  limit = 50,
  sinceDate?: Date
): Promise<MemoryEventRow[]> {
  return (prisma as any).memoryEvent.findMany({
    where: {
      instanceId,
      ...(sinceDate && { createdAt: { gte: sinceDate } }),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function searchEpisodicByVector(
  instanceId: string,
  embeddingStr: string,
  limit = 10
): Promise<MemorySearchResult[]> {
  return prisma.$queryRawUnsafe<MemorySearchResult[]>(
    `SELECT id, instance_id as "instanceId", session_id as "sessionId",
            event_type as "eventType", channel, sender_id as "senderId",
            content, summary, importance,
            consolidated_at as "consolidatedAt", expires_at as "expiresAt",
            metadata, created_at as "createdAt",
            1 - (embedding <=> $1::vector) as similarity
     FROM memory_events
     WHERE instance_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    instanceId,
    limit
  )
}

export async function searchEpisodicByText(
  instanceId: string,
  query: string,
  limit = 10
): Promise<MemorySearchResult[]> {
  return prisma.$queryRawUnsafe<MemorySearchResult[]>(
    `SELECT id, instance_id as "instanceId", session_id as "sessionId",
            event_type as "eventType", channel, sender_id as "senderId",
            content, summary, importance,
            consolidated_at as "consolidatedAt", expires_at as "expiresAt",
            metadata, created_at as "createdAt",
            ts_rank(to_tsvector('english', content || ' ' || COALESCE(summary,'')),
                    plainto_tsquery('english', $1)) as similarity
     FROM memory_events
     WHERE instance_id = $2
       AND (expires_at IS NULL OR expires_at > NOW())
       AND to_tsvector('english', content || ' ' || COALESCE(summary,'')) @@ plainto_tsquery('english', $1)
     ORDER BY similarity DESC
     LIMIT $3`,
    query,
    instanceId,
    limit
  )
}

export async function getUnconsolidatedEvents(
  instanceId: string,
  olderThanDays = 7
): Promise<MemoryEventRow[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - olderThanDays)

  return (prisma as any).memoryEvent.findMany({
    where: {
      instanceId,
      consolidatedAt: null,
      createdAt: { lt: cutoff },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
}

export async function markConsolidated(ids: string[]): Promise<void> {
  await (prisma as any).memoryEvent.updateMany({
    where: { id: { in: ids } },
    data: { consolidatedAt: new Date() },
  })
}

export async function deleteExpiredEvents(): Promise<number> {
  const result = await (prisma as any).memoryEvent.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

export async function countEvents(
  instanceId: string,
  since?: Date
): Promise<number> {
  return (prisma as any).memoryEvent.count({
    where: {
      instanceId,
      ...(since && { createdAt: { gte: since } }),
    },
  })
}
