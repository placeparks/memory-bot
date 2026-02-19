import { prisma } from '@/lib/prisma'
import { generateEmbedding, embeddingToSql } from '../embeddings'
import { EntityCreate, EntityRow, EntityWithRelationships } from '../types'

export async function upsertEntity(data: EntityCreate): Promise<EntityRow> {
  const existing = await (prisma as any).entity.findFirst({
    where: { instanceId: data.instanceId, name: data.name },
  })

  let entity: any
  if (existing) {
    entity = await (prisma as any).entity.update({
      where: { id: existing.id },
      data: {
        summary: data.summary ?? existing.summary,
        aliases: data.aliases?.length ? data.aliases : existing.aliases,
        metadata: data.metadata ?? existing.metadata ?? undefined,
        interactionCount: { increment: 1 },
        lastSeen: new Date(),
        updatedAt: new Date(),
      },
    })
  } else {
    entity = await (prisma as any).entity.create({
      data: {
        instanceId: data.instanceId,
        type: data.type,
        name: data.name,
        aliases: data.aliases ?? [],
        summary: data.summary,
        metadata: data.metadata ?? undefined,
        lastSeen: new Date(),
      },
    })
  }

  // Generate embedding for the entity
  const text = `${entity.name} ${entity.aliases.join(' ')} ${entity.summary ?? ''}`
  const embedding = await generateEmbedding(text)
  if (embedding) {
    const embStr = embeddingToSql(embedding)
    await prisma.$executeRawUnsafe(
      `UPDATE entities SET embedding = $1::vector WHERE id = $2`,
      embStr,
      entity.id
    )
  }

  return entity
}

export async function getEntities(
  instanceId: string,
  limit = 100
): Promise<EntityRow[]> {
  return (prisma as any).entity.findMany({
    where: { instanceId },
    orderBy: [{ interactionCount: 'desc' }, { lastSeen: 'desc' }],
    take: limit,
  })
}

export async function getEntityById(id: string): Promise<EntityWithRelationships | null> {
  const entity = await (prisma as any).entity.findUnique({
    where: { id },
    include: {
      relationshipsA: { include: { entityB: true } },
      relationshipsB: { include: { entityA: true } },
    },
  })

  if (!entity) return null

  const relationships = [
    ...entity.relationshipsA.map((r: any) => ({
      id: r.id,
      entityId: r.entityB.id,
      entityName: r.entityB.name,
      entityType: r.entityB.type,
      relationshipType: r.relationshipType,
      confidence: r.confidence,
      notes: r.notes,
    })),
    ...entity.relationshipsB.map((r: any) => ({
      id: r.id,
      entityId: r.entityA.id,
      entityName: r.entityA.name,
      entityType: r.entityA.type,
      relationshipType: `inverse:${r.relationshipType}`,
      confidence: r.confidence,
      notes: r.notes,
    })),
  ]

  return { ...entity, relationships }
}

export async function searchEntitiesByVector(
  instanceId: string,
  embeddingStr: string,
  limit = 5
): Promise<EntityRow[]> {
  return prisma.$queryRawUnsafe<EntityRow[]>(
    `SELECT id, instance_id as "instanceId", type, name, aliases, summary,
            importance, interaction_count as "interactionCount",
            last_seen as "lastSeen", metadata, created_at as "createdAt", updated_at as "updatedAt"
     FROM entities
     WHERE instance_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    instanceId,
    embeddingStr,
    limit
  )
}

export async function addEntityRelationship(
  entityAId: string,
  entityBId: string,
  relationshipType: string,
  confidence = 0.8,
  notes?: string
): Promise<void> {
  await (prisma as any).entityRelationship.upsert({
    where: {
      entityAId_entityBId_relationshipType: { entityAId, entityBId, relationshipType },
    },
    create: { entityAId, entityBId, relationshipType, confidence, notes },
    update: { confidence, notes },
  })
}

export async function countEntities(instanceId: string): Promise<number> {
  return (prisma as any).entity.count({ where: { instanceId } })
}
