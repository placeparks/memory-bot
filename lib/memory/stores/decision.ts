import { prisma } from '@/lib/prisma'
import { generateEmbedding, embeddingToSql } from '../embeddings'
import { DecisionCreate, DecisionRow } from '../types'

export async function storeDecision(data: DecisionCreate): Promise<string> {
  const decision = await (prisma as any).decision.create({
    data: {
      instanceId: data.instanceId,
      sessionId: data.sessionId,
      channel: data.channel,
      senderId: data.senderId,
      decision: data.decision,
      reasoning: data.reasoning,
      confidence: data.confidence ?? 0.7,
      entitiesInvolved: data.entitiesInvolved ?? [],
      documentsUsed: data.documentsUsed ?? [],
      memoriesUsed: data.memoriesUsed ?? [],
      modelUsed: data.modelUsed,
      tokensUsed: data.tokensUsed,
      contextSnapshot: data.contextSnapshot ?? undefined,
    },
  })

  // Embed the decision text for future retrieval
  const text = `${data.decision} ${data.reasoning.join(' ')}`
  const embedding = await generateEmbedding(text)
  if (embedding) {
    const embStr = embeddingToSql(embedding)
    await prisma.$executeRawUnsafe(
      `UPDATE decisions SET embedding = $1::vector WHERE id = $2`,
      embStr,
      decision.id
    )
  }

  return decision.id
}

export async function getDecisions(
  instanceId: string,
  limit = 50,
  offset = 0
): Promise<DecisionRow[]> {
  return (prisma as any).decision.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })
}

export async function getDecisionById(id: string): Promise<DecisionRow | null> {
  return (prisma as any).decision.findUnique({ where: { id } })
}

export async function updateDecisionOutcome(id: string, outcome: string): Promise<void> {
  await (prisma as any).decision.update({
    where: { id },
    data: { outcome, outcomeAt: new Date() },
  })
}

export async function searchDecisionsByVector(
  instanceId: string,
  embeddingStr: string,
  limit = 5
): Promise<DecisionRow[]> {
  return prisma.$queryRawUnsafe<DecisionRow[]>(
    `SELECT id, instance_id as "instanceId", session_id as "sessionId",
            channel, sender_id as "senderId", decision, reasoning, confidence,
            entities_involved as "entitiesInvolved", documents_used as "documentsUsed",
            memories_used as "memoriesUsed", model_used as "modelUsed",
            tokens_used as "tokensUsed", context_snapshot as "contextSnapshot",
            outcome, outcome_at as "outcomeAt", created_at as "createdAt", updated_at as "updatedAt"
     FROM decisions
     WHERE instance_id = $2 AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    instanceId,
    limit
  )
}

export async function countDecisions(instanceId: string): Promise<number> {
  return (prisma as any).decision.count({ where: { instanceId } })
}
