import { prisma } from '@/lib/prisma'
import { getUnconsolidatedEvents, markConsolidated, deleteExpiredEvents } from '../stores/episodic'
import { upsertEntity } from '../stores/semantic'
import { consolidateEvents } from './entity-extractor'

export async function runConsolidation(instanceId: string): Promise<{
  consolidated: number
  entitiesUpdated: number
  expired: number
}> {
  // 1. Delete expired events
  const expired = await deleteExpiredEvents()

  // 2. Get unconsolidated events (older than 7 days)
  const events = await getUnconsolidatedEvents(instanceId, 7)
  if (events.length === 0) return { consolidated: 0, entitiesUpdated: 0, expired }

  // 3. Group by sender
  const bySender = new Map<string, typeof events>()
  for (const event of events) {
    const key = event.senderId ?? '__unknown__'
    if (!bySender.has(key)) bySender.set(key, [])
    bySender.get(key)!.push(event)
  }

  let consolidated = 0
  let entitiesUpdated = 0

  for (const [senderId, senderEvents] of bySender) {
    if (senderEvents.length < 3) continue // Not enough data to consolidate

    const profile = await consolidateEvents(
      senderId,
      senderEvents.map(e => ({
        content: e.content,
        summary: e.summary,
        createdAt: new Date(e.createdAt),
      }))
    )

    if (profile && profile.name) {
      await upsertEntity({
        instanceId,
        type: profile.type,
        name: profile.name,
        aliases: [senderId, ...(profile.aliases ?? [])].filter(Boolean),
        summary: profile.summary,
        metadata: profile.metadata,
      })
      entitiesUpdated++
    }

    // Mark events as consolidated
    await markConsolidated(senderEvents.map(e => e.id))
    consolidated += senderEvents.length
  }

  return { consolidated, entitiesUpdated, expired }
}

export async function runConsolidationForAll(): Promise<void> {
  const instances = await prisma.instance.findMany({
    where: { status: 'RUNNING' },
    include: { config: { select: { memoryEnabled: true } } },
  })

  for (const instance of instances) {
    if (!(instance as any).config?.memoryEnabled) continue
    try {
      const result = await runConsolidation(instance.id)
      console.log(`[Nexus] Consolidated ${instance.id}:`, result)
    } catch (err) {
      console.error(`[Nexus] Consolidation failed for ${instance.id}:`, err)
    }
  }
}
