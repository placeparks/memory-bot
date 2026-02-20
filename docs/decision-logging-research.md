# Decision Logging Research & Options

## Context
The Nexus Memory system has a `decisions` table in PostgreSQL. The goal is to
automatically detect and save "decisions" (notable recommendations the bot makes)
without spending money on a second Anthropic API call from our server.

The bot is CineBuzz — an entertainment intelligence agent running on OpenClaw,
deployed on Railway.

---

## How the Current System Works

### Full pipeline (when ANTHROPIC_API_KEY is set on server)
```
OpenClaw bot talks to user
        ↓
Cron runs every 15 min  →  POST /api/memory/cron/mine
        ↓
mineInstanceLogs() fetches the bot's Railway logs
        ↓
Claude Haiku reads the logs, classifies events, detects decisions
        ↓
storeDecision()  →  decisions table in DB
```

### Without ANTHROPIC_API_KEY
- `extractEventsFromLogs()` returns `[]` immediately (early exit)
- Cron runs but does nothing
- Zero events, zero decisions, zero entities saved automatically

---

## API Endpoints (already built, working)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/memory/:id/decisions` | Store a decision |
| GET | `/api/memory/:id/decisions` | List decisions |
| GET | `/api/memory/:id/decisions/:id` | Get single decision |
| PATCH | `/api/memory/:id/decisions/:id` | Update outcome |
| POST | `/api/memory/:id/store` | Store a memory event (CONVERSATION, DECISION, etc.) |
| POST | `/api/memory/:id/search` | Search memory |
| GET | `/api/memory/:id/stats` | Stats including totalDecisions |

Auth: `Authorization: Bearer <memoryApiKey>` (from memoryConfig table)

Instance used for testing:
- instanceId: `cmltz4jow0004xp18h9clnpng`
- memoryApiKey: `1ca196ebdab768e908aa336d94c1aa28f25e1cd60d056f754f8c8b89c79f3bb2`
- app URL: `https://memory-bot-production.up.railway.app`

---

## Options Analysed

### Option A — Server-side log mining (Anthropic API) ✅ BEST but costs money
- Server fetches bot logs every 15 min
- Claude Haiku reads logs and classifies decisions
- Fully automatic, high reliability
- **Cost**: ~$0.0001/run × 96 runs/day × users = ~$1.44/month per 100 users (Haiku pricing)
- **Status**: Already built, just needs `ANTHROPIC_API_KEY` env var on Railway server
- **Verdict**: Best approach. Add the key when revenue justifies it.

### Option B — Digest instruction + web.fetch ❌ REVERTED — unsafe assumption
- Add HTTP POST instruction to `[NEXUS MEMORY]` digest
- Bot's LLM follows instruction and calls `/decisions` after each recommendation
- **Problem**: `tools.web.fetch` is a web browsing tool (GET/parse URLs).
  We cannot confirm it supports POST with custom headers + JSON body.
  Adding the instruction risks confusing the agent on every conversation.
- **Status**: Was implemented, then reverted. Do NOT re-add until OpenClaw
  `tools.web.fetch` capabilities are confirmed from docs.

### Option C — Pattern matching on logs ❌ too crude
- Scan logs for keywords: "I recommend", "I suggest", "you should"
- No AI needed, zero cost
- High false positive/negative rate, misses context entirely
- Not worth implementing for a memory system

### Option D — Manual logging ✅ zero cost, works now
- User or external code explicitly POSTs to `/api/memory/:id/decisions`
- Or user marks decisions from the dashboard
- No automation, but 100% accurate for what gets logged
- **Test script**: `scripts/test-decisions.mjs` — run with:
  ```
  node scripts/test-decisions.mjs <BASE_URL> <INSTANCE_ID> <MEMORY_API_KEY>
  ```

---

## OpenClaw Research Findings

### What we know for sure
- Config schema valid top-level keys: `gateway, agents, channels, tools, messages,
  models, auth, bindings, logging, meta, session`
- `tools.web.fetch` = "fetch and parse web pages" — browser-like, almost certainly GET only
- `tools.web.search` = Brave Search API (requires `braveApiKey`)
- `agents.defaults.memorySearch` = enables memory searching in agent context
- SOUL.md = agent's personality file, written from `_SYSTEM_PROMPT` env var at startup
- Memory digest is prepended to system prompt via `buildSystemPromptWithMemory()`
- System prompt survives via `[NEXUS MEMORY]...[/NEXUS MEMORY]` block prepended
  automatically — user edits to system prompt do NOT affect this block

### Critical unknown — needs OpenClaw docs to confirm
**Does `memorySearch` make OpenClaw call our `/store` endpoint automatically?**

We never pass our server URL to OpenClaw in the `memorySearch` config:
```json
{
  "agents": { "defaults": { "memorySearch": { "enabled": true, "sources": ["memory", "sessions"] } } }
}
```

No URL, no API key, nothing. So OpenClaw likely does NOT call our `/store`
endpoint automatically. The `memory` source probably refers to something
internal to OpenClaw (its own memory layer), not our PostgreSQL DB.

If that's confirmed → there is no automatic callback hook from OpenClaw to our
server, and Option A (Anthropic API) is the only real automation path.

### `bindings` key
Valid OpenClaw config key but not currently used by our config-builder.
Unknown what it does. **Check OpenClaw docs** — if it supports HTTP webhooks
or callbacks after message processing, this could be the hook we need for
zero-cost decision detection.

---

## Recommended Next Steps

1. **Confirm `memorySearch` behavior** from OpenClaw docs:
   - Does it call an external URL? If so, what URL format does it expect?
   - What does `sources: ["memory", "sessions"]` mean exactly?

2. **Confirm `bindings` config key** from OpenClaw docs:
   - Does it support post-message HTTP webhooks?
   - If yes → we can receive each conversation server-side, do lightweight
     detection (keyword or cheap AI call), store decision if detected.
     This would be the best zero-cost automated approach.

3. **Confirm `tools.web.fetch` capabilities**:
   - Does it support POST requests with custom headers and JSON body?
   - If yes → Option B (digest instruction) can be safely re-enabled.
   - If no → leave it reverted.

4. **Short term**: Keep Option A code in place (log-miner.ts, entity-extractor.ts,
   cron routes). Enable by adding `ANTHROPIC_API_KEY` to Railway server env when ready.

5. **Short term**: Use Option D (manual) for now. The `/decisions` API and
   dashboard page are already working.

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/memory/stores/decision.ts` | storeDecision, getDecisions, searchDecisionsByVector |
| `lib/memory/processing/log-miner.ts` | mineInstanceLogs — Option A engine |
| `lib/memory/processing/entity-extractor.ts` | Claude Haiku calls for event/entity extraction |
| `lib/memory/processing/digest-builder.ts` | Builds [NEXUS MEMORY] block |
| `lib/deploy/config-updater.ts` | rebuildAndApply — where digest is injected |
| `lib/openclaw/config-builder.ts` | generateOpenClawConfig — OpenClaw JSON builder |
| `app/api/memory/[instanceId]/decisions/route.ts` | GET/POST decisions API |
| `app/api/memory/[instanceId]/decisions/[id]/route.ts` | GET/PATCH single decision |
| `app/api/memory/[instanceId]/store/route.ts` | OpenClaw memory store endpoint |
| `app/api/memory/[instanceId]/search/route.ts` | OpenClaw memory search endpoint |
| `app/api/memory/cron/mine/route.ts` | Cron trigger for log mining |
| `scripts/test-decisions.mjs` | End-to-end test for decision DB persistence |
| `scripts/test-pdf-parse.mjs` | PDF worker smoke test |
