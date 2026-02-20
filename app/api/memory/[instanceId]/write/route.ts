/**
 * GET /api/memory/[instanceId]/write
 *
 * GET-based memory write endpoint — designed for AI agents whose web.fetch
 * tool only supports GET requests (e.g. OpenClaw browser/fetch).
 *
 * Query params:
 *   key        — memory API key (required)
 *   type       — "episode" | "decision" | "profile" | "outcome"
 *
 * type=episode
 *   summary    — 1-2 sentence description (URL-encoded)
 *   tags       — comma-separated (e.g. "movies,recommendation")
 *   senderId   — user identifier (optional, defaults to "default")
 *
 * type=decision
 *   context    — situation that prompted the decision
 *   decision   — what was decided/recommended
 *   reasoning  — pipe-separated reasons (e.g. "reason 1|reason 2")
 *   alternatives — pipe-separated alternatives considered
 *   tags       — comma-separated
 *   senderId   — optional
 *
 * type=profile
 *   senderId   — user identifier (defaults to "default")
 *   name, role, timezone, style, focus, preferences (comma-separated)
 *
 * type=outcome
 *   id         — decision id returned from a previous type=decision call
 *   outcome    — what actually happened
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeEpisode } from '@/lib/memory/stores/episodes'
import { storeDecision, updateDecisionOutcome } from '@/lib/memory/stores/decisions'
import { upsertProfile } from '@/lib/memory/stores/profiles'

async function verifyKey(instanceId: string, key: string): Promise<boolean> {
  if (!key) return false
  const cfg = await (prisma as any).memoryConfig.findFirst({
    where: { instanceId, memoryApiKey: key },
  })
  return !!cfg
}

export async function GET(
  req: NextRequest,
  { params }: { params: { instanceId: string } }
) {
  const { instanceId } = params
  const url = new URL(req.url)
  const p = (name: string) => url.searchParams.get(name) ?? ''

  const key = p('key')
  const type = p('type')

  if (!await verifyKey(instanceId, key)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (type === 'episode') {
      const summary = p('summary')
      if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 })
      const tags = p('tags') ? p('tags').split(',').map(t => t.trim()).filter(Boolean) : []
      const senderId = p('senderId') || undefined
      const episode = await storeEpisode({ instanceId, senderId, summary, tags })
      return NextResponse.json({ ok: true, id: episode.id })
    }

    if (type === 'decision') {
      const context = p('context')
      const decision = p('decision')
      if (!context || !decision) {
        return NextResponse.json({ error: 'context and decision required' }, { status: 400 })
      }
      const reasoning = p('reasoning') ? p('reasoning').split('|').map(r => r.trim()).filter(Boolean) : []
      const alternatives = p('alternatives') ? p('alternatives').split('|').map(a => a.trim()).filter(Boolean) : []
      const tags = p('tags') ? p('tags').split(',').map(t => t.trim()).filter(Boolean) : []
      const senderId = p('senderId') || undefined
      const row = await storeDecision({
        instanceId, senderId, context, decision, reasoning,
        alternativesConsidered: alternatives, tags,
      })
      return NextResponse.json({ ok: true, id: row.id })
    }

    if (type === 'profile') {
      const senderId = p('senderId') || 'default'
      const preferences = p('preferences') ? p('preferences').split(',').map(s => s.trim()).filter(Boolean) : undefined
      const profile = await upsertProfile({
        instanceId, senderId,
        name: p('name') || undefined,
        role: p('role') || undefined,
        timezone: p('timezone') || undefined,
        communicationStyle: p('style') || undefined,
        currentFocus: p('focus') || undefined,
        preferences,
      })
      return NextResponse.json({ ok: true, id: profile.id })
    }

    if (type === 'outcome') {
      const id = p('id')
      const outcome = p('outcome')
      if (!id || !outcome) {
        return NextResponse.json({ error: 'id and outcome required' }, { status: 400 })
      }
      await updateDecisionOutcome(id, outcome)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'type must be episode|decision|profile|outcome' }, { status: 400 })

  } catch (err: any) {
    console.error('[Memory Write]', err)
    return NextResponse.json({ error: err.message ?? 'write failed' }, { status: 500 })
  }
}
