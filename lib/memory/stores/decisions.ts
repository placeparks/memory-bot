import { prisma } from '@/lib/prisma'
import { DecisionData, DecisionRow } from '../types'

export async function storeDecision(data: DecisionData): Promise<DecisionRow> {
  return (prisma as any).memoryDecision.create({
    data: {
      instanceId: data.instanceId,
      senderId: data.senderId,
      context: data.context,
      decision: data.decision,
      reasoning: data.reasoning,
      alternativesConsidered: data.alternativesConsidered ?? [],
      tags: data.tags ?? [],
    },
  })
}

export async function getDecisions(
  instanceId: string,
  opts?: {
    tags?: string[]
    since?: Date
    limit?: number
    offset?: number
  }
): Promise<DecisionRow[]> {
  const where: any = { instanceId }
  if (opts?.tags?.length) where.tags = { hasSome: opts.tags }
  if (opts?.since) where.createdAt = { gte: opts.since }

  return (prisma as any).memoryDecision.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
  })
}

export async function getDecisionById(id: string): Promise<DecisionRow | null> {
  return (prisma as any).memoryDecision.findUnique({ where: { id } })
}

export async function updateDecisionOutcome(id: string, outcome: string): Promise<DecisionRow> {
  return (prisma as any).memoryDecision.update({
    where: { id },
    data: { outcome, outcomeAt: new Date() },
  })
}

export async function countDecisions(instanceId: string): Promise<number> {
  return (prisma as any).memoryDecision.count({ where: { instanceId } })
}
