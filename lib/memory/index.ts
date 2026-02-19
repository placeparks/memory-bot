import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { MemoryStats, MemoryTier } from './types'
import { getTierLimits } from './tiers'
import { countEvents } from './stores/episodic'
import { countEntities } from './stores/semantic'
import { countDecisions } from './stores/decision'
import { countDocuments, getTotalDocumentsMB } from './stores/documents'

export async function getOrCreateMemoryConfig(instanceId: string) {
  let config = await (prisma as any).memoryConfig.findUnique({ where: { instanceId } })

  if (!config) {
    config = await (prisma as any).memoryConfig.create({
      data: {
        instanceId,
        tier: 'STANDARD',
        retentionDays: 30,
        maxEntities: 100,
        maxDocumentsMB: 500,
        memoryApiKey: randomBytes(32).toString('hex'),
      },
    })
  }

  return config
}

export async function getMemoryStats(instanceId: string): Promise<MemoryStats> {
  const config = await getOrCreateMemoryConfig(instanceId)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalEvents, totalEntities, totalDecisions, totalDocuments, documentsUsedMB, eventsThisMonth] =
    await Promise.all([
      countEvents(instanceId),
      countEntities(instanceId),
      countDecisions(instanceId),
      countDocuments(instanceId),
      getTotalDocumentsMB(instanceId),
      countEvents(instanceId, monthStart),
    ])

  return {
    tier: config.tier as MemoryTier,
    totalEvents,
    totalEntities,
    totalDecisions,
    totalDocuments,
    documentsUsedMB,
    eventsThisMonth,
    limits: getTierLimits(config.tier as MemoryTier),
    memoryApiKey: config.memoryApiKey,
  }
}

export async function rotateMemoryApiKey(instanceId: string): Promise<string> {
  const newKey = randomBytes(32).toString('hex')
  await (prisma as any).memoryConfig.update({
    where: { instanceId },
    data: { memoryApiKey: newKey },
  })
  return newKey
}

// Re-export commonly used functions
export { storeMemoryEvent } from './stores/episodic'
export { upsertEntity } from './stores/semantic'
export { storeDecision } from './stores/decision'
export { storeDocument } from './stores/documents'
export { unifiedSearch } from './retrieval/semantic-search'
export { buildMemoryDigest } from './processing/digest-builder'
export { mineInstanceLogs, mineAllInstances } from './processing/log-miner'
export { runConsolidation, runConsolidationForAll } from './processing/consolidation'
