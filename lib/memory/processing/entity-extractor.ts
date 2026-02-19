import { ExtractedEntity, ExtractedEvent } from '../types'

let anthropicClient: any = null

async function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!anthropicClient) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    } catch {
      return null
    }
  }
  return anthropicClient
}

export async function extractEntities(text: string): Promise<ExtractedEntity[]> {
  const client = await getAnthropic()
  if (!client || !text.trim()) return []

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract notable entities from this conversation. Only include clearly relevant people, organizations, products, or important topics.

Conversation:
${text.slice(0, 4000)}

Return JSON array only (no explanation):
[{"name":"...","type":"PERSON|ORGANIZATION|TOPIC|PRODUCT|LOCATION|OTHER","aliases":[],"context":"brief description","relationships":[{"entity":"...","type":"..."}]}]

Return [] if no notable entities found.`,
      }],
    })

    const raw = (msg.content[0] as any).text?.trim() ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]) as ExtractedEntity[]
  } catch (err) {
    console.error('[Nexus] Entity extraction failed:', err)
    return []
  }
}

export async function extractEventsFromLogs(logs: string): Promise<ExtractedEvent[]> {
  const client = await getAnthropic()
  if (!client || !logs.trim()) return []

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Analyze these AI agent logs. Extract meaningful conversation events only (ignore infrastructure/system logs).

Logs:
${logs.slice(0, 6000)}

Return JSON array only:
[{
  "eventType": "CONVERSATION|DECISION|TASK_COMPLETED|FEEDBACK|ERROR",
  "sessionId": "session ID if visible or null",
  "channel": "whatsapp|telegram|discord|slack|other or null",
  "senderId": "sender ID/number if visible or null",
  "content": "full conversation content",
  "summary": "2-sentence summary",
  "importance": 0.1-1.0,
  "decision": "decision description if a notable recommendation was made, else null",
  "reasoning": ["reasoning step 1", "..."] or null
}]

Return [] if no meaningful conversation events found.`,
      }],
    })

    const raw = (msg.content[0] as any).text?.trim() ?? ''
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0]) as ExtractedEvent[]
  } catch (err) {
    console.error('[Nexus] Log mining failed:', err)
    return []
  }
}

export async function consolidateEvents(
  senderId: string,
  events: Array<{ content: string; summary?: string; createdAt: Date }>
): Promise<{
  name: string | null
  type: 'PERSON' | 'ORGANIZATION'
  aliases: string[]
  summary: string
  importance: number
  metadata: Record<string, any>
} | null> {
  const client = await getAnthropic()
  if (!client || events.length === 0) return null

  const startDate = events[events.length - 1].createdAt.toISOString().split('T')[0]
  const endDate = events[0].createdAt.toISOString().split('T')[0]
  const eventText = events
    .slice(0, 20)
    .map(e => e.summary ?? e.content.slice(0, 300))
    .join('\n---\n')

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Create a consolidated profile for this user/contact based on conversation history.

Sender ID: ${senderId}
Date range: ${startDate} to ${endDate}
Events:
${eventText}

Return JSON only:
{
  "name": "full name if known, else null",
  "type": "PERSON|ORGANIZATION",
  "aliases": ["alternate names/IDs"],
  "summary": "3-4 sentence profile: who are they, what do they want, communication style",
  "importance": 0.1-1.0,
  "metadata": {
    "language": "preferred language if detected or null",
    "role": "their job/role if mentioned or null",
    "topics": ["main topics they discuss"]
  }
}`,
      }],
    })

    const raw = (msg.content[0] as any).text?.trim() ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('[Nexus] Consolidation AI failed:', err)
    return null
  }
}
