import { prisma } from '@/lib/prisma'
import { getEntities } from '../stores/semantic'
import { getDecisions } from '../stores/decision'
import { countEvents } from '../stores/episodic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Max total characters of document content to inject into the system prompt
const DOC_CONTENT_BUDGET = 12000

async function getDocumentsWithContent(instanceId: string) {
  return (prisma as any).knowledgeDocument.findMany({
    where: { instanceId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      sizeBytes: true,
      content: true,
      chunkCount: true,
    },
  })
}

async function getAllDocuments(instanceId: string) {
  return (prisma as any).knowledgeDocument.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, status: true },
  })
}

export async function buildMemoryDigest(instanceId: string): Promise<string | null> {
  try {
    const [entities, decisions, docsWithContent, allDocs, totalEvents, memConfig, instanceConfig] = await Promise.all([
      getEntities(instanceId, 10),
      getDecisions(instanceId, 5, 0),
      getDocumentsWithContent(instanceId),
      getAllDocuments(instanceId),
      countEvents(instanceId),
      (prisma as any).memoryConfig.findUnique({ where: { instanceId } }),
      prisma.configuration.findUnique({ where: { instanceId }, select: { browserEnabled: true } }),
    ])

    if (entities.length === 0 && decisions.length === 0 && allDocs.length === 0) {
      return null
    }

    const lines: string[] = ['[NEXUS MEMORY]']

    if (entities.length > 0) {
      lines.push(`\nKNOWN CONTACTS & ENTITIES (${entities.length}):`)
      for (const e of entities.slice(0, 8)) {
        const lastSeen = e.lastSeen
          ? `Last seen ${Math.floor((Date.now() - new Date(e.lastSeen).getTime()) / 86400000)}d ago.`
          : ''
        const summary = e.summary ? e.summary.slice(0, 120) : ''
        lines.push(`• ${e.name} (${e.type}) — ${summary}${summary ? ' ' : ''}${lastSeen}`)
      }
    }

    if (decisions.length > 0) {
      lines.push(`\nRECENT DECISIONS:`)
      for (const d of decisions.slice(0, 5)) {
        const date = new Date(d.createdAt).toISOString().split('T')[0]
        const firstReason = d.reasoning[0] ?? ''
        lines.push(
          `• ${date}: ${d.decision.slice(0, 140)}` +
          (firstReason ? ` — "${firstReason.slice(0, 80)}"` : '')
        )
      }
    }

    // Inject document content inline, up to budget
    const docs = docsWithContent as any[]
    if (docs.length > 0) {
      let budget = DOC_CONTENT_BUDGET
      lines.push(`\nKNOWLEDGE BASE (${allDocs.length} docs):`)

      for (const doc of docs) {
        if (budget <= 0) break
        const content: string = doc.content ?? ''
        if (!content.trim()) {
          lines.push(`\n--- ${doc.filename} (empty) ---`)
          continue
        }
        const snippet = content.slice(0, budget)
        const truncated = content.length > budget
        lines.push(`\n--- ${doc.filename} ---`)
        lines.push(snippet)
        if (truncated) lines.push(`[...truncated, ${content.length - budget} chars remaining]`)
        budget -= snippet.length
      }

      // List any pending/indexing docs that weren't included
      const pendingDocs = (allDocs as any[]).filter(
        (d: any) => d.status !== 'READY' || !docs.find((r: any) => r.id === d.id)
      )
      if (pendingDocs.length > 0) {
        lines.push(`\nIndexing: ${pendingDocs.map((d: any) => d.filename).join(', ')}`)
      }
    }

    if (totalEvents > 0) {
      lines.push(`\nMEMORY: ${totalEvents} total interactions stored.`)
    }

    // Inject decision-logging instruction when browser/fetch tool is available.
    // Lives here (not in user's system prompt) so it survives prompt edits.
    if (instanceConfig?.browserEnabled && memConfig?.memoryApiKey) {
      lines.push(`\nDECISION LOGGING:`)
      lines.push(`When you make a notable recommendation or decision (e.g. suggest a specific movie, actor, product, or course of action), silently log it AFTER sending your reply by making this HTTP call:`)
      lines.push(`POST ${APP_URL}/api/memory/${instanceId}/decisions`)
      lines.push(`Headers: Authorization: Bearer ${memConfig.memoryApiKey} | Content-Type: application/json`)
      lines.push(`Body: {"decision":"<one sentence>","reasoning":["<why 1>","<why 2>"],"confidence":0.8,"channel":"<channel name>","senderId":"<user id>"}`)
      lines.push(`Only log meaningful decisions — skip greetings and casual replies.`)
    }

    lines.push('[/NEXUS MEMORY]')

    const digest = lines.join('\n')

    // Cache the digest
    await (prisma as any).memoryConfig.updateMany({
      where: { instanceId },
      data: { digestContent: digest, lastDigestAt: new Date() },
    })

    return digest
  } catch (err) {
    console.error('[Nexus] Digest build failed:', err)
    return null
  }
}
