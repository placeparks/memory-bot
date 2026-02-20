import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { MemoryStats } from './types'
import { countDecisions } from './stores/decisions'
import { countDocuments, getTotalDocumentsMB } from './stores/documents'

export async function getOrCreateMemoryConfig(instanceId: string) {
  let config = await (prisma as any).memoryConfig.findUnique({ where: { instanceId } })

  if (!config) {
    try {
      config = await (prisma as any).memoryConfig.create({
        data: {
          instanceId,
          maxDocumentsMB: 500,
          memoryApiKey: randomBytes(32).toString('hex'),
        },
      })
    } catch (err) {
      // Old schema may have extra NOT NULL columns — fall back to upsert with defaults
      config = await (prisma as any).memoryConfig.upsert({
        where: { instanceId },
        create: {
          instanceId,
          maxDocumentsMB: 500,
          memoryApiKey: randomBytes(32).toString('hex'),
        },
        update: {},
      })
    }
  }

  return config
}

export async function getMemoryStats(instanceId: string): Promise<MemoryStats> {
  // Each count is wrapped independently — a missing table never zeroes out the others
  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn() } catch { return fallback }
  }

  const [config, profiles, decisions, episodes, documents, documentsUsedMB] = await Promise.all([
    safe(() => getOrCreateMemoryConfig(instanceId), null),
    safe(() => (prisma as any).memoryProfile.count({ where: { instanceId } }), 0),
    safe(() => countDecisions(instanceId), 0),
    safe(() => (prisma as any).memoryEpisode.count({ where: { instanceId } }), 0),
    safe(() => countDocuments(instanceId), 0),
    safe(() => getTotalDocumentsMB(instanceId), 0),
  ])

  return {
    profiles,
    decisions,
    episodes,
    documents,
    documentsUsedMB,
    maxDocumentsMB: config?.maxDocumentsMB ?? 500,
    memoryApiKey: config?.memoryApiKey ?? '',
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
export { upsertProfile, getProfile, getAllProfiles } from './stores/profiles'
export { storeDecision, getDecisions, updateDecisionOutcome } from './stores/decisions'
export { storeEpisode, getEpisodes } from './stores/episodes'
export { storeDocument } from './stores/documents'
export { buildMemoryDigest } from './processing/digest-builder'
