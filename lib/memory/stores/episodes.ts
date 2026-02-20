import { prisma } from '@/lib/prisma'
import { EpisodeData, EpisodeRow } from '../types'

export async function storeEpisode(data: EpisodeData): Promise<EpisodeRow> {
  return (prisma as any).memoryEpisode.create({
    data: {
      instanceId: data.instanceId,
      senderId: data.senderId,
      summary: data.summary,
      tags: data.tags ?? [],
      happenedAt: data.happenedAt ?? new Date(),
    },
  })
}

export async function getEpisodes(
  instanceId: string,
  opts?: {
    since?: Date
    limit?: number
    senderId?: string
  }
): Promise<EpisodeRow[]> {
  const where: any = { instanceId }
  if (opts?.since) where.happenedAt = { gte: opts.since }
  if (opts?.senderId) where.senderId = opts.senderId

  return (prisma as any).memoryEpisode.findMany({
    where,
    orderBy: { happenedAt: 'desc' },
    take: opts?.limit ?? 50,
  })
}

export async function countEpisodes(instanceId: string): Promise<number> {
  return (prisma as any).memoryEpisode.count({ where: { instanceId } })
}
