// ── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileData {
  instanceId: string
  senderId?: string
  name?: string
  role?: string
  communicationStyle?: string
  timezone?: string
  currentFocus?: string
  relationshipContext?: string
  preferences?: string[]
  metadata?: Record<string, any>
}

export interface ProfileRow extends Required<Pick<ProfileData, 'instanceId' | 'senderId'>> {
  id: string
  name: string | null
  role: string | null
  communicationStyle: string | null
  timezone: string | null
  currentFocus: string | null
  relationshipContext: string | null
  preferences: string[]
  metadata: Record<string, any> | null
  createdAt: Date
  updatedAt: Date
}

// ── Decision ─────────────────────────────────────────────────────────────────

export interface DecisionData {
  instanceId: string
  senderId?: string
  context: string
  decision: string
  reasoning: string[]
  alternativesConsidered?: string[]
  tags?: string[]
}

export interface DecisionRow {
  id: string
  instanceId: string
  senderId: string | null
  context: string
  decision: string
  reasoning: string[]
  alternativesConsidered: string[]
  tags: string[]
  outcome: string | null
  outcomeAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ── Episode ───────────────────────────────────────────────────────────────────

export interface EpisodeData {
  instanceId: string
  senderId?: string
  summary: string
  tags?: string[]
  happenedAt?: Date
}

export interface EpisodeRow {
  id: string
  instanceId: string
  senderId: string | null
  summary: string
  tags: string[]
  happenedAt: Date
  createdAt: Date
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface MemoryStats {
  profiles: number
  decisions: number
  episodes: number
  documents: number
  documentsUsedMB: number
  maxDocumentsMB: number
  memoryApiKey: string
}

// ── RAG (documents — unchanged) ───────────────────────────────────────────────

export interface RAGResult {
  content: string
  similarity: number
  source: {
    documentId: string
    filename: string
    chunkIndex: number
  }
}
