import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { MemoryStats } from './types'
import { countDecisions } from './stores/decisions'
import { countDocuments, getTotalDocumentsMB } from './stores/documents'

export async function getOrCreateMemoryConfig(instanceId: string) {
  let config = await (prisma as any).memoryConfig.findUnique({ where: { instanceId } })

  if (!config) {
    config = await (prisma as any).memoryConfig.create({
      data: {
        instanceId,
        maxDocumentsMB: 500,
        memoryApiKey: randomBytes(32).toString('hex'),
      },
    })
  }

  return config
}

export async function getMemoryStats(instanceId: string): Promise<MemoryStats> {
  const config = await getOrCreateMemoryConfig(instanceId)

  const [profiles, decisions, episodes, documents, documentsUsedMB] = await Promise.all([
    (prisma as any).memoryProfile.count({ where: { instanceId } }),
    countDecisions(instanceId),
    (prisma as any).memoryEpisode.count({ where: { instanceId } }),
    countDocuments(instanceId),
    getTotalDocumentsMB(instanceId),
  ])

  return {
    profiles,
    decisions,
    episodes,
    documents,
    documentsUsedMB,
    maxDocumentsMB: config.maxDocumentsMB,
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
export { upsertProfile, getProfile, getAllProfiles } from './stores/profiles'
export { storeDecision, getDecisions, updateDecisionOutcome } from './stores/decisions'
export { storeEpisode, getEpisodes } from './stores/episodes'
export { storeDocument } from './stores/documents'
export { buildMemoryDigest } from './processing/digest-builder'
