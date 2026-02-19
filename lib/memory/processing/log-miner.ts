import { prisma } from '@/lib/prisma'
import { extractEventsFromLogs, extractEntities } from './entity-extractor'
import { storeMemoryEvent } from '../stores/episodic'
import { upsertEntity, addEntityRelationship } from '../stores/semantic'
import { storeDecision } from '../stores/decision'
import { scoreImportance } from './importance-scorer'

export async function mineInstanceLogs(instanceId: string): Promise<{
  eventsExtracted: number
  entitiesFound: number
}> {
  const memConfig = await (prisma as any).memoryConfig.findUnique({ where: { instanceId } })
  if (!memConfig) return { eventsExtracted: 0, entitiesFound: 0 }

  // Fetch logs via internal API
  let logs = ''
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${appUrl}/api/instance/logs`, {
      headers: {
        Cookie: `__Secure-next-auth.session-token=skip`, // handled by x-internal header
        'x-internal-secret': process.env.MEMORY_API_SECRET ?? '',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const data = await res.json()
      logs = Array.isArray(data.logs) ? data.logs.join('\n') : String(data.logs ?? '')
    }
  } catch (err) {
    console.warn('[Nexus] Could not fetch logs for', instanceId, err)
    return { eventsExtracted: 0, entitiesFound: 0 }
  }

  if (logs.trim().length < 100) return { eventsExtracted: 0, entitiesFound: 0 }

  // Extract events via Claude Haiku
  const events = await extractEventsFromLogs(logs)
  let eventsExtracted = 0
  let entitiesFound = 0

  for (const event of events) {
    const importance = event.importance ?? scoreImportance(event.content)

    await storeMemoryEvent(
      {
        instanceId,
        sessionId: event.sessionId ?? undefined,
        eventType: event.eventType,
        channel: event.channel ?? undefined,
        senderId: event.senderId ?? undefined,
        content: event.content,
        summary: event.summary,
        importance,
      },
      memConfig.tier
    )
    eventsExtracted++

    // Store decision separately if found
    if (event.decision && event.reasoning?.length) {
      await storeDecision({
        instanceId,
        sessionId: event.sessionId ?? undefined,
        channel: event.channel ?? undefined,
        senderId: event.senderId ?? undefined,
        decision: event.decision,
        reasoning: event.reasoning,
        confidence: importance,
      })
    }

    // Extract and store entities
    const entities = await extractEntities(event.content)
    for (const ent of entities) {
      await upsertEntity({
        instanceId,
        type: ent.type,
        name: ent.name,
        aliases: ent.aliases,
        summary: ent.context,
      })
      entitiesFound++

      // Store relationships
      for (const rel of ent.relationships) {
        const relEntity = await (prisma as any).entity.findFirst({
          where: { instanceId, name: rel.entity },
        })
        const thisEntity = await (prisma as any).entity.findFirst({
          where: { instanceId, name: ent.name },
        })
        if (relEntity && thisEntity && thisEntity.id !== relEntity.id) {
          await addEntityRelationship(thisEntity.id, relEntity.id, rel.type)
        }
      }
    }
  }

  // Update last mined timestamp
  await (prisma as any).memoryConfig.update({
    where: { instanceId },
    data: { lastLogMinedAt: new Date() },
  })

  return { eventsExtracted, entitiesFound }
}

export async function mineAllInstances(): Promise<void> {
  const instances = await prisma.instance.findMany({
    where: { status: 'RUNNING' },
    include: { config: { select: { memoryEnabled: true } } },
  })

  for (const instance of instances) {
    if (!(instance as any).config?.memoryEnabled) continue
    try {
      const result = await mineInstanceLogs(instance.id)
      if (result.eventsExtracted > 0) {
        console.log(`[Nexus] Mined ${instance.id}: ${result.eventsExtracted} events, ${result.entitiesFound} entities`)
      }
    } catch (err) {
      console.error(`[Nexus] Log mining failed for ${instance.id}:`, err)
    }
  }
}
