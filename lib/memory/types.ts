export type MemoryTier = 'STANDARD' | 'PRO'
export type MemoryEventType = 'CONVERSATION' | 'DECISION' | 'TASK_COMPLETED' | 'FEEDBACK' | 'ERROR'
export type EntityType = 'PERSON' | 'ORGANIZATION' | 'TOPIC' | 'PRODUCT' | 'LOCATION' | 'OTHER'

export interface MemoryEventCreate {
  instanceId: string
  sessionId?: string
  eventType: MemoryEventType
  channel?: string
  senderId?: string
  content: string
  summary?: string
  importance?: number
  metadata?: Record<string, any>
}

export interface MemoryEventRow {
  id: string
  instanceId: string
  sessionId?: string
  eventType: MemoryEventType
  channel?: string
  senderId?: string
  content: string
  summary?: string
  importance: number
  consolidatedAt?: Date
  expiresAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
}

export interface MemorySearchResult extends MemoryEventRow {
  similarity: number
}

export interface EntityCreate {
  instanceId: string
  type: EntityType
  name: string
  aliases?: string[]
  summary?: string
  metadata?: Record<string, any>
}

export interface EntityRow {
  id: string
  instanceId: string
  type: EntityType
  name: string
  aliases: string[]
  summary?: string
  importance: number
  interactionCount: number
  lastSeen?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface EntityWithRelationships extends EntityRow {
  relationships: Array<{
    id: string
    entityId: string
    entityName: string
    entityType: EntityType
    relationshipType: string
    confidence: number
    notes?: string
  }>
}

export interface DecisionCreate {
  instanceId: string
  sessionId?: string
  channel?: string
  senderId?: string
  decision: string
  reasoning: string[]
  confidence?: number
  entitiesInvolved?: string[]
  documentsUsed?: string[]
  memoriesUsed?: string[]
  modelUsed?: string
  tokensUsed?: number
  contextSnapshot?: Record<string, any>
}

export interface DecisionRow {
  id: string
  instanceId: string
  sessionId?: string
  channel?: string
  senderId?: string
  decision: string
  reasoning: string[]
  confidence: number
  entitiesInvolved: string[]
  documentsUsed: string[]
  memoriesUsed: string[]
  modelUsed?: string
  tokensUsed?: number
  contextSnapshot?: Record<string, any>
  outcome?: string
  outcomeAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface RAGResult {
  content: string
  similarity: number
  source: {
    documentId: string
    filename: string
    chunkIndex: number
  }
}

export interface TierLimits {
  retentionDays: number | null
  maxEntities: number | null
  maxDocumentsMB: number
  maxEventsPerMonth: number
}

export interface MemoryStats {
  tier: MemoryTier
  totalEvents: number
  totalEntities: number
  totalDecisions: number
  totalDocuments: number
  documentsUsedMB: number
  eventsThisMonth: number
  limits: TierLimits
  memoryApiKey: string
}

export interface ExtractedEvent {
  eventType: MemoryEventType
  sessionId?: string
  channel?: string
  senderId?: string
  content: string
  summary: string
  importance: number
  decision?: string
  reasoning?: string[]
}

export interface ExtractedEntity {
  name: string
  type: EntityType
  aliases: string[]
  context: string
  relationships: Array<{ entity: string; type: string }>
}
