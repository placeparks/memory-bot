import { LogEntry } from '@/lib/railway/client'

export interface UsageStats {
  messagesProcessed: number
  uptime: string
  avgResponseTime: string
  tokensUsed: number
}

// Patterns that indicate a message was received/processed by the bot
const MESSAGE_PATTERNS = [
  /\[telegram\].*(?:received|incoming|message from|processing)/i,
  /\[discord\].*(?:received|incoming|message from|processing)/i,
  /\[whatsapp\].*(?:received|incoming|message from|processing)/i,
  /\[slack\].*(?:received|incoming|message from|processing)/i,
  /\[signal\].*(?:received|incoming|message from|processing)/i,
  /\[matrix\].*(?:received|incoming|message from|processing)/i,
  /\[gateway\].*(?:request|inbound|handling message)/i,
  // OpenClaw logs message processing with these patterns
  /\[agent\].*(?:processing|handling|responding)/i,
  /\[session\].*(?:new message|message received)/i,
]

// Patterns that indicate a reply was sent
const REPLY_PATTERNS = [
  /\[telegram\].*(?:sent|reply|respond|sending)/i,
  /\[discord\].*(?:sent|reply|respond|sending)/i,
  /\[whatsapp\].*(?:sent|reply|respond|sending)/i,
  /\[gateway\].*(?:response sent|reply sent|completed)/i,
  /\[agent\].*(?:response|replied|completed turn)/i,
]

// Token usage patterns
const TOKEN_PATTERNS = [
  /(\d[\d,]*)\s*tokens?\s*(?:used|consumed|total)/i,
  /tokens?[:\s]+(\d[\d,]*)/i,
  /usage[:\s]+(\d[\d,]*)\s*tokens?/i,
  /input[:\s]+(\d[\d,]*)\s*.*output[:\s]+(\d[\d,]*)/i,
]

// Response time patterns
const TIMING_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*ms/i,
  /completed\s+in\s+(\d+(?:\.\d+)?)\s*(?:ms|seconds?)/i,
  /response\s+time[:\s]+(\d+(?:\.\d+)?)\s*(?:ms|s)/i,
  /latency[:\s]+(\d+(?:\.\d+)?)\s*(?:ms|s)/i,
]

function countMessages(logs: LogEntry[]): number {
  let count = 0
  for (const log of logs) {
    const msg = log.message
    for (const pattern of MESSAGE_PATTERNS) {
      if (pattern.test(msg)) {
        count++
        break
      }
    }
    for (const pattern of REPLY_PATTERNS) {
      if (pattern.test(msg)) {
        count++
        break
      }
    }
  }
  return count
}

function extractTokens(logs: LogEntry[]): number {
  let total = 0
  for (const log of logs) {
    for (const pattern of TOKEN_PATTERNS) {
      const match = log.message.match(pattern)
      if (match) {
        // Sum all captured groups (handles input + output token patterns)
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            total += parseInt(match[i].replace(/,/g, ''), 10) || 0
          }
        }
        break
      }
    }
  }
  return total
}

function extractAvgResponseTime(logs: LogEntry[]): string {
  const times: number[] = []
  for (const log of logs) {
    for (const pattern of TIMING_PATTERNS) {
      const match = log.message.match(pattern)
      if (match && match[1]) {
        let ms = parseFloat(match[1])
        // If the pattern matched "seconds", convert to ms
        if (/seconds?/i.test(log.message) && !log.message.includes('ms')) {
          ms *= 1000
        }
        if (ms > 0 && ms < 300000) { // reasonable range: 0-5min
          times.push(ms)
        }
        break
      }
    }
  }

  if (times.length === 0) return '--'

  const avg = times.reduce((a, b) => a + b, 0) / times.length
  if (avg < 1000) return `${Math.round(avg)}ms`
  return `${(avg / 1000).toFixed(1)}s`
}

function calculateUptime(deploymentCreatedAt?: string): string {
  if (!deploymentCreatedAt) return '--'

  const created = new Date(deploymentCreatedAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()

  if (diffMs < 0) return '--'

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

export function parseLogsForStats(
  logs: LogEntry[],
  deploymentCreatedAt?: string
): UsageStats {
  return {
    messagesProcessed: countMessages(logs),
    uptime: calculateUptime(deploymentCreatedAt),
    avgResponseTime: extractAvgResponseTime(logs),
    tokensUsed: extractTokens(logs),
  }
}
