import { prisma } from '@/lib/prisma'
import { getEntities } from '../stores/semantic'
import { getDecisions } from '../stores/decision'
import { getDocuments } from '../stores/documents'
import { countEvents } from '../stores/episodic'

export async function buildMemoryDigest(instanceId: string): Promise<string | null> {
  try {
    const [entities, decisions, documents, totalEvents] = await Promise.all([
      getEntities(instanceId, 10),
      getDecisions(instanceId, 5, 0),
      getDocuments(instanceId),
      countEvents(instanceId),
    ])

    if (entities.length === 0 && decisions.length === 0 && (documents as any[]).length === 0) {
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

    const docs = documents as any[]
    if (docs.length > 0) {
      lines.push(`\nKNOWLEDGE BASE (${docs.length} docs):`)
      lines.push(docs.map((d: any) => d.filename).slice(0, 10).join(', '))
    }

    if (totalEvents > 0) {
      lines.push(`\nMEMORY: ${totalEvents} total interactions stored.`)
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
