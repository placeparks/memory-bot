import { prisma } from '@/lib/prisma'
import { getProfile } from '../stores/profiles'
import { getDecisions } from '../stores/decisions'
import { getEpisodes } from '../stores/episodes'

// Max total characters of document content to inject into the system prompt
const DOC_CONTENT_BUDGET = 12_000

async function getDocumentsWithContent(instanceId: string) {
  return (prisma as any).knowledgeDocument.findMany({
    where: { instanceId, status: 'READY' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, content: true },
  })
}

async function getAllDocuments(instanceId: string) {
  return (prisma as any).knowledgeDocument.findMany({
    where: { instanceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, filename: true, status: true },
  })
}

export async function buildMemoryDigest(
  instanceId: string,
  senderId = 'default'
): Promise<string | null> {
  try {
    const [profile, decisions, episodes, docsWithContent, allDocs] = await Promise.all([
      getProfile(instanceId, senderId),
      getDecisions(instanceId, { limit: 5 }),
      getEpisodes(instanceId, { limit: 7, senderId: senderId !== 'default' ? senderId : undefined }),
      getDocumentsWithContent(instanceId),
      getAllDocuments(instanceId),
    ])

    const hasContent =
      profile || decisions.length > 0 || episodes.length > 0 || allDocs.length > 0
    if (!hasContent) return null

    const lines: string[] = []

    // Header
    const headerName = profile?.name ?? senderId
    lines.push(`[MEMORY — ${headerName}]`)

    // Layer 1 — Profile
    if (profile) {
      lines.push('\nPROFILE:')
      const profileParts: string[] = []
      if (profile.role) profileParts.push(`Role: ${profile.role}`)
      if (profile.timezone) profileParts.push(`Timezone: ${profile.timezone}`)
      if (profileParts.length) lines.push(profileParts.join(' | '))
      if (profile.communicationStyle) lines.push(`Style: ${profile.communicationStyle}`)
      if (profile.currentFocus) lines.push(`Focus: ${profile.currentFocus}`)
      if (profile.preferences?.length) lines.push(`Prefs: ${profile.preferences.join(', ')}`)
      if (profile.relationshipContext) lines.push(`Context: ${profile.relationshipContext}`)
    }

    // Layer 2 — Decision history
    if (decisions.length > 0) {
      lines.push('\nDECISION HISTORY:')
      for (const d of decisions) {
        lines.push('──────────────────────────────────────────────')
        const date = new Date(d.createdAt).toISOString().split('T')[0]
        const tags = d.tags.map((t: string) => `#${t}`).join(' ')
        const worked = d.outcome ? '  ✓ WORKED' : ''
        lines.push(`${date}  ${tags}${worked}`)
        lines.push(`Decided: ${d.decision}`)
        if (d.reasoning.length > 0) {
          const reasons = d.reasoning.slice(0, 3).join('; ')
          lines.push(`Because: ${reasons}`)
        }
        if (d.alternativesConsidered?.length) {
          lines.push(`Alternatives: ${d.alternativesConsidered.join(', ')}`)
        }
        if (d.outcome) {
          lines.push(`Result: ${d.outcome} ✓`)
        }
      }
      lines.push('──────────────────────────────────────────────')
      lines.push('(Search older: GET /decisions?tags=X)')
    }

    // Layer 3 — Recent episodes
    if (episodes.length > 0) {
      lines.push('\nRECENT EPISODES:')
      for (const ep of episodes) {
        const date = new Date(ep.happenedAt).toISOString().split('T')[0]
        const tags = ep.tags?.length ? ` [${ep.tags.join(', ')}]` : ''
        lines.push(`• ${date}${tags}: ${ep.summary}`)
      }
    }

    // Knowledge base
    const docs = docsWithContent as any[]
    if (allDocs.length > 0) {
      lines.push('\nKNOWLEDGE BASE:')
      let budget = DOC_CONTENT_BUDGET

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
        if (truncated) lines.push(`[...${content.length - budget} chars truncated]`)
        budget -= snippet.length
      }

      const pendingDocs = (allDocs as any[]).filter(
        (d: any) => d.status !== 'READY' || !docs.find((r: any) => r.id === d.id)
      )
      if (pendingDocs.length > 0) {
        lines.push(`\nIndexing: ${pendingDocs.map((d: any) => d.filename).join(', ')}`)
      }
    }

    lines.push('[/MEMORY]')

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
