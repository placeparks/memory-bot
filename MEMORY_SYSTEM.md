# Nexus Memory System — Capabilities Document

## Overview

Nexus Memory is a structured, persistent memory layer for AI agents deployed on this platform. It gives agents the ability to remember users across conversations, log decisions with full reasoning chains, track conversation history, and search uploaded knowledge documents — all without vectors, AI extraction pipelines, or extra API costs.

**Core principle:** The agent writes every memory entry itself during conversations. Nothing is inferred, mined, or similarity-matched after the fact. When the agent reads "Result: Open rates 18%→31%" it knows that's exact — because it wrote it.

---

## Architecture

```
PostgreSQL (Supabase)
├── memory_profiles      — Who the user is
├── memory_decisions     — What was decided and why
├── memory_episodes      — What happened in past conversations
├── knowledge_documents  — Uploaded files (PDF, TXT, etc.)
├── document_chunks      — Chunked + embedded document content
└── memory_configs       — API key + storage config per instance

Next.js API (Vercel)
└── /api/memory/[instanceId]/
    ├── write            — GET-based write endpoint (agent uses this)
    ├── profiles/        — Profile CRUD
    ├── decisions/       — Decision CRUD + outcome patching
    ├── episodes/        — Episode log
    ├── documents/       — Document upload + management
    └── stats/           — Usage dashboard data

OpenClaw Container (Railway)
└── System prompt contains:
    ├── [MEMORY] block   — digest of what the agent already knows
    └── [MEMORY API]     — instructions for how to write new memories
```

---

## Three Memory Layers

### Layer 1 — Identity Profile

One profile per user (identified by their channel ID — Telegram user ID, Discord ID, etc.). The agent builds and updates this as it learns stable facts about the person.

**What gets stored:**
| Field | Example |
|-------|---------|
| `name` | Alice Chen |
| `role` | Marketing Director, Acme Corp |
| `timezone` | PST |
| `communicationStyle` | Direct, data-driven, bullet points only |
| `currentFocus` | Q1 2026 marketing campaign |
| `preferences` | ["no small talk", "data before opinion"] |
| `relationshipContext` | Any other stable context |

**How it's used:** The profile is injected at the top of every conversation. The agent always knows who it's talking to without the user needing to re-introduce themselves.

**API:**
```
PATCH /api/memory/{instanceId}/profiles/{senderId}
Body: { name, role, timezone, communicationStyle, currentFocus, preferences[] }

GET  /api/memory/{instanceId}/profiles              — list all profiles
GET  /api/memory/{instanceId}/profiles/{senderId}   — get one profile
DELETE /api/memory/{instanceId}/profiles/{senderId}
```

---

### Layer 2 — Decision Journal

Every significant recommendation, choice, or decision the agent makes is logged with full context. This is the most valuable layer — it's what separates an assistant that remembers from one that learns.

**What gets stored:**
| Field | Example |
|-------|---------|
| `context` | Email deliverability dropped to 87% after domain change |
| `decision` | Switch from SendGrid to Mailchimp for all marketing emails |
| `reasoning[]` | ["Mailchimp reputation better for low-volume senders", "Cost: $50/mo vs $400/mo", "Migration ~4 hours"] |
| `alternativesConsidered[]` | ["Fix SendGrid SPF/DKIM config", "Move to AWS SES"] |
| `tags[]` | ["email", "vendor", "cost"] |
| `outcome` | Open rates 18%→31%. Saved $350/mo. *(added later)* |
| `outcomeAt` | 2026-02-01 |

**The outcome loop:** When a user later says "that Mailchimp switch worked great", the agent patches the outcome on that decision. Over time, the agent doesn't just remember decisions — it knows which ones worked and why.

**API:**
```
POST  /api/memory/{instanceId}/decisions
Body: { context, decision, reasoning[], alternativesConsidered[], tags[], senderId }
Returns: { id }  ← save this to record outcome later

GET   /api/memory/{instanceId}/decisions?limit=50&tags=email,vendor&since=2026-01-01
GET   /api/memory/{instanceId}/decisions/{id}
PATCH /api/memory/{instanceId}/decisions/{id}
Body: { outcome }
```

**Tag filtering:** Decisions are queryable by tags with no vector search needed. `GET /decisions?tags=email` returns all email-related decisions instantly via SQL array matching.

---

### Layer 3 — Episode Timeline

After each meaningful exchange, the agent writes a 1–2 sentence compressed summary. Not raw logs — just what happened and what was agreed.

**Example entries:**
```
2026-01-20 [marketing]: Q4 review — lead gen down 18%.
                        Agreed on content marketing focus for Q1.
2025-12-15 [budget]:    2026 marketing budget set at $180k, 60% digital.
2025-11-10 [hiring]:    Team growing 5→12. Async hiring process approved.
```

**What gets stored:**
| Field | Example |
|-------|---------|
| `summary` | Alice presented Q4 results showing lead gen down 18%. Agreed on content marketing as Q1 priority. |
| `tags[]` | ["marketing", "q4-review"] |
| `happenedAt` | 2026-01-20 |
| `senderId` | user's channel ID |

**API:**
```
POST /api/memory/{instanceId}/episodes
Body: { summary, tags[], senderId, happenedAt? }

GET  /api/memory/{instanceId}/episodes?limit=50&senderId=123&since=2026-01-01
```

---

## Knowledge Base (RAG)

Users can upload documents (PDF, TXT, MD, etc.) that the agent can search and reference. Content is chunked, embedded via OpenAI `text-embedding-3-small`, and stored as pgvector embeddings for semantic search. Falls back to PostgreSQL full-text search if no OpenAI key is configured.

**Supported file types:** PDF, TXT, MD, CSV, and any plain-text format.

**What gets stored:**
- Full document content
- Chunked content (~500 words per chunk, 50-word overlap)
- Vector embedding per chunk (1536 dimensions)
- Document metadata (filename, size, status)

**Search modes:**
- **Vector search** — semantic similarity (requires `OPENAI_API_KEY`)
- **Full-text search** — PostgreSQL `ts_rank` fallback (always available)

**API:**
```
POST   /api/memory/{instanceId}/documents   — upload file (multipart/form-data)
GET    /api/memory/{instanceId}/documents   — list all documents
DELETE /api/memory/{instanceId}/documents/{id}
```

**Storage limit:** 500 MB per instance (configurable in `memory_configs`).

---

## What the Agent Sees Every Conversation

The memory digest is automatically built and injected into the agent's system prompt on every config update. Format:

```
[MEMORY — Alice Chen]

PROFILE:
Role: Marketing Director, Acme Corp | Timezone: PST
Style: Direct, data-driven, bullet points only
Focus: Q1 2026 marketing campaign

DECISION HISTORY:
──────────────────────────────────────────────
2026-01-15  #email #vendor  ✓ WORKED
Decided: Switched SendGrid → Mailchimp
Because: Deliverability 87%; Mailchimp $350/mo cheaper
Alternatives: Fix SendGrid SPF/DKIM; Move to AWS SES
Result: Open rates 18%→31%, saved $350/mo ✓
──────────────────────────────────────────────
2025-11-20  #hiring #process  ✓ WORKED
Decided: Async-first hiring process
Because: Team across 3 timezones; sync calls inefficient
Result: Time-to-hire -40% ✓
──────────────────────────────────────────────
(Search older: GET /decisions?tags=X)

RECENT EPISODES:
• 2026-01-20 [marketing]: Q4 review — lead gen down 18%, agreed Q1 = content marketing
• 2026-01-10 [email]: Set up 3-email welcome sequence. Alice approved copy + timing.
• 2025-12-15 [budget]: Budget planning — $180k total, 60% digital

KNOWLEDGE BASE:
--- Q1_Strategy.pdf ---
[full document content up to 12,000 char budget]

[/MEMORY]
```

**Token budget:** ~1,200 tokens typical. Always accurate. Never hallucinated.

**Injection rules:**
- Last 5 decisions always included
- Last 7 episodes always included
- All READY documents included up to 12,000 character budget
- Profile always included if it exists

---

## How the Agent Writes Memories

The agent uses a GET-based write endpoint (designed for OpenClaw's `web_fetch` tool which only supports GET requests). All parameters are URL-encoded.

### Write an episode
```
GET /api/memory/{instanceId}/write
  ?key={memoryApiKey}
  &type=episode
  &summary=Alice+presented+Q4+results...
  &tags=marketing,q4-review
  &senderId=123456
```

### Log a decision
```
GET /api/memory/{instanceId}/write
  ?key={memoryApiKey}
  &type=decision
  &context=Email+deliverability+dropped...
  &decision=Switch+to+Mailchimp
  &reasoning=Better+reputation|Cheaper|Fast+migration
  &alternatives=Fix+SPF%2FDKIM|Move+to+SES
  &tags=email,vendor
  &senderId=123456
Returns: { ok: true, id: "clx..." }
```

### Update a user profile
```
GET /api/memory/{instanceId}/write
  ?key={memoryApiKey}
  &type=profile
  &senderId=123456
  &name=Alice+Chen
  &role=Marketing+Director
  &timezone=PST
  &style=Direct%2C+data-driven
  &focus=Q1+2026+campaign
```

### Record an outcome
```
GET /api/memory/{instanceId}/write
  ?key={memoryApiKey}
  &type=outcome
  &id={decisionId}
  &outcome=Open+rates+18%25+to+31%25%2C+saved+%24350%2Fmo
```

---

## Authentication

All memory API endpoints accept two auth methods:

| Method | Use case |
|--------|----------|
| **Session cookie** | Dashboard users (browser) |
| **Bearer token** | Agent HTTP calls — `Authorization: Bearer {memoryApiKey}` |

The `memoryApiKey` is a 64-character hex key auto-generated per instance. Visible and copyable from the Memory dashboard page.

---

## Dashboard

Available at `/dashboard/memory`:

| Page | URL | What it shows |
|------|-----|---------------|
| Overview | `/dashboard/memory` | Profile / decision / episode / doc counts, storage bar, API key |
| Decisions | `/dashboard/memory/decisions` | Full decision journal — expandable cards with context, reasoning, alternatives, outcome recorder |
| Documents | `/dashboard/memory/documents` | Upload + manage knowledge base files |

---

## Database Tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `memory_profiles` | Per-user identity | `instanceId`, `senderId` (unique pair), profile fields |
| `memory_decisions` | Decision journal | `instanceId`, `context`, `decision`, `reasoning[]`, `tags[]`, `outcome` |
| `memory_episodes` | Conversation log | `instanceId`, `senderId`, `summary`, `tags[]`, `happenedAt` |
| `knowledge_documents` | Uploaded files | `instanceId`, `filename`, `content`, `status`, `chunkCount` |
| `document_chunks` | RAG chunks | `documentId`, `instanceId`, `chunkIndex`, `content`, `embedding` |
| `memory_configs` | Config per instance | `instanceId`, `memoryApiKey`, `maxDocumentsMB` |

All column names are **camelCase** (no snake_case) — Prisma does not auto-convert.

---

## What Was Removed vs What Stays

### Removed (v1 pipeline — too complex, didn't work on Railway)
- `log-miner.ts` — automatically mined agent logs for memories
- `entity-extractor.ts` — used Claude Haiku to extract entities from conversations
- `consolidation.ts` — periodically merged duplicate memories
- `importance-scorer.ts` — AI-scored memory importance
- Vercel cron jobs (ran every 15 min + daily)
- `memory_events`, `entities`, `entity_relationships` tables
- pgvector embeddings on memory entries

### Stays / Added (v2 — simple, reliable, $0 extra cost)
- Knowledge document upload + chunking + pgvector RAG search
- Three-layer structured memory (profiles, decisions, episodes)
- Agent-driven writes via GET endpoint
- Dashboard UI for all three layers
- Memory digest auto-injected into system prompt

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection (Supabase) |
| `NEXTAUTH_URL` | Yes | Base URL — embedded in agent's memory API instructions |
| `OPENAI_API_KEY` | Optional | Enables vector embeddings for RAG search. Falls back to full-text search if absent. |

---

## Limitations

- **Container restart wipes local files** — OpenClaw's local `MEMORY.md` / daily notes live in the container filesystem and are lost on redeploy. The Nexus Memory DB is the only persistent store.
- **Agent must be instructed** — memories are only written if the agent follows the `[MEMORY API]` instructions in its system prompt. Low-quality models may ignore them.
- **No cross-instance memory** — profiles, decisions, and episodes are scoped to one `instanceId`. Each deployed agent has its own isolated memory.
- **Outcome patching is manual** — the agent patches outcomes when users explicitly confirm results. There's no automatic outcome detection.
- **12,000 char doc budget** — if total document content exceeds this, older/larger docs get truncated in the digest. Full content is always available for RAG search.
