# Changelog

## [Nexus Memory System] — February 2026

### Overview
Complete implementation of the Nexus Memory & RAG system — a 4-layer long-term memory engine for OpenClaw agents. Agents can now remember decisions made months ago (with full reasoning), build entity knowledge graphs, and search uploaded documents.

---

### New Dependencies
- `@anthropic-ai/sdk` — Claude Haiku for log mining, entity extraction, memory consolidation
- `openai` — text-embedding-3-small for semantic vector search (optional, falls back to FTS)

---

### Database Changes (`prisma/schema.prisma`)
- Enabled `postgresqlExtensions` preview feature + `vector` extension (pgvector)
- Added 7 new models:
  - `MemoryEvent` — episodic memory (conversations, decisions, feedback)
  - `Entity` — semantic memory (people, orgs, topics with embeddings)
  - `EntityRelationship` — relationships between entities
  - `Decision` — full decision audit trail with reasoning chains
  - `KnowledgeDocument` — user-uploaded RAG documents
  - `DocumentChunk` — chunked + embedded document pieces
  - `MemoryConfig` — per-instance tier config + API key + digest cache
- Added enums: `MemoryEventType`, `EntityType`, `DocumentStatus`, `MemoryTier`

---

### New Files

#### Service Layer (`lib/memory/`)
| File | Purpose |
|---|---|
| `types.ts` | All TypeScript interfaces for the memory system |
| `tiers.ts` | STANDARD vs PRO tier limits |
| `embeddings.ts` | OpenAI embedding service with graceful null fallback |
| `index.ts` | Main facade — getOrCreateMemoryConfig, getMemoryStats, re-exports |
| `stores/episodic.ts` | Store/search conversation events, expiry, consolidation tracking |
| `stores/semantic.ts` | Entity upsert, graph, vector search |
| `stores/decision.ts` | Decision CRUD, outcome tracking, vector search |
| `stores/documents.ts` | Document storage, chunking, RAG vector + FTS search |
| `retrieval/semantic-search.ts` | Unified search across all 4 memory types in parallel |
| `processing/importance-scorer.ts` | Heuristic importance scoring (no LLM needed) |
| `processing/entity-extractor.ts` | Claude Haiku — extract entities, mine logs, consolidate profiles |
| `processing/log-miner.ts` | Reads running agent logs, extracts events + decisions automatically |
| `processing/consolidation.ts` | Rolls up episodic → semantic memory (nightly) |
| `processing/digest-builder.ts` | Builds memory context block injected into agent system prompt |

#### API Routes (`app/api/memory/`)
| Route | Method | Purpose |
|---|---|---|
| `/[instanceId]/stats` | GET | Memory usage stats + API key |
| `/[instanceId]/store` | POST | Manually store a memory event |
| `/[instanceId]/search` | POST | Unified semantic/FTS search |
| `/[instanceId]/decisions` | GET, POST | List or create decisions |
| `/[instanceId]/decisions/[id]` | GET, PATCH | Get decision detail, record outcome |
| `/[instanceId]/entities` | GET | List all known entities |
| `/[instanceId]/entities/[id]` | GET | Get entity with relationships |
| `/[instanceId]/documents` | GET, POST | List documents or upload new |
| `/[instanceId]/documents/[id]` | DELETE | Delete a document + its chunks |
| `/cron/mine` | GET | Trigger log mining for all instances |
| `/cron/consolidate` | GET | Trigger memory consolidation for all instances |

#### Dashboard Pages (`app/(dashboard)/dashboard/memory/`)
| Page | URL | Purpose |
|---|---|---|
| `page.tsx` | `/dashboard/memory` | Overview — stats, usage bars, quick nav, API key |
| `decisions/page.tsx` | `/dashboard/memory/decisions` | Decision audit trail — searchable, expandable reasoning, outcome recorder |
| `entities/page.tsx` | `/dashboard/memory/entities` | Entity knowledge graph — type filters, interaction counts |
| `documents/page.tsx` | `/dashboard/memory/documents` | RAG knowledge base — upload files, live test search, status tracking |

#### Other New Files
| File | Purpose |
|---|---|
| `vercel.json` | Cron jobs — mine logs every 15 min, consolidate daily at 3am UTC |
| `public/test-knowledge-base.txt` | Dummy document for testing RAG upload + search |

---

### Modified Files

#### `lib/openclaw/config-builder.ts`
- Added `memoryDigest?: string` field to `UserConfiguration` interface
- Added `buildSystemPromptWithMemory()` helper — prepends Nexus Memory digest to agent system prompt

#### `lib/deploy/config-updater.ts`
- Updated `rebuildAndApply()` to call `buildMemoryDigest()` when `memoryEnabled: true`
- Memory digest is automatically injected into the agent's system prompt on every config rebuild

#### `package.json`
- Added `@anthropic-ai/sdk: ^0.39.0`
- Added `openai: ^4.85.0`

---

### Environment Variables Required
```env
# Required for AI-powered features (log mining, entity extraction, consolidation)
ANTHROPIC_API_KEY=sk-ant-...

# Optional — enables semantic vector search (falls back to keyword search if not set)
OPENAI_API_KEY=sk-...

# Protects cron endpoints in production
CRON_SECRET=your-random-secret
```

---

### Memory Tiers

| Limit | STANDARD | PRO |
|---|---|---|
| Retention | 30 days | Unlimited |
| Entities | 100 | Unlimited |
| Document storage | 500 MB | 10 GB |
| Events/month | 5,000 | 100,000 |

---

### How It Works
1. Agent runs → logs are mined every 15 min → events + decisions stored in PostgreSQL
2. Entities extracted from conversations → knowledge graph built automatically
3. User uploads documents → chunked, embedded, indexed for RAG search
4. Every config update → memory digest built → injected into agent system prompt
5. Nightly consolidation → episodic memories → compact semantic entity profiles
6. Agent always has top entities, recent decisions, and document list in its context
