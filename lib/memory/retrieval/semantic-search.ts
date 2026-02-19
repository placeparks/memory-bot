import { generateEmbedding, embeddingToSql } from '../embeddings'
import { searchEpisodicByVector, searchEpisodicByText } from '../stores/episodic'
import { searchEntitiesByVector } from '../stores/semantic'
import { searchDecisionsByVector } from '../stores/decision'
import { ragSearchByVector, ragSearchByText } from '../stores/documents'
import { MemorySearchResult, EntityRow, DecisionRow, RAGResult } from '../types'

export interface UnifiedSearchResult {
  events: MemorySearchResult[]
  entities: EntityRow[]
  decisions: DecisionRow[]
  documents: RAGResult[]
}

export async function unifiedSearch(
  instanceId: string,
  query: string,
  options: {
    includeEvents?: boolean
    includeEntities?: boolean
    includeDecisions?: boolean
    includeDocs?: boolean
  } = {}
): Promise<UnifiedSearchResult> {
  const {
    includeEvents = true,
    includeEntities = true,
    includeDecisions = true,
    includeDocs = true,
  } = options

  const embedding = await generateEmbedding(query)
  const embStr = embedding ? embeddingToSql(embedding) : null

  const [events, entities, decisions, documents] = await Promise.all([
    includeEvents
      ? embStr
        ? searchEpisodicByVector(instanceId, embStr, 10)
        : searchEpisodicByText(instanceId, query, 10)
      : Promise.resolve([]),
    includeEntities && embStr
      ? searchEntitiesByVector(instanceId, embStr, 5)
      : Promise.resolve([]),
    includeDecisions && embStr
      ? searchDecisionsByVector(instanceId, embStr, 5)
      : Promise.resolve([]),
    includeDocs
      ? embStr
        ? ragSearchByVector(instanceId, embStr, 5)
        : ragSearchByText(instanceId, query, 5)
      : Promise.resolve([]),
  ])

  return {
    events: events as MemorySearchResult[],
    entities: entities as EntityRow[],
    decisions: decisions as DecisionRow[],
    documents,
  }
}
