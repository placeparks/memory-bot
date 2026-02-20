import { AIProvider, ChannelType } from '@prisma/client'
import { getDefaultModel, getProviderEnvVar } from '@/lib/models'

export interface UserConfiguration {
  provider: AIProvider
  apiKey: string
  model?: string
  channels: {
    type: ChannelType
    config: Record<string, any>
  }[]
  webSearchEnabled?: boolean
  braveApiKey?: string
  browserEnabled?: boolean
  ttsEnabled?: boolean
  elevenlabsApiKey?: string
  canvasEnabled?: boolean
  cronEnabled?: boolean
  memoryEnabled?: boolean
  workspace?: string
  agentName?: string
  systemPrompt?: string
  thinkingMode?: string
  sessionMode?: string
  dmPolicy?: string
  gatewayToken?: string
  // Nexus Memory — injected digest (built server-side)
  memoryDigest?: string
}

/**
 * Filter out channels that are missing required credentials.
 * Templates can preset channels the user never configured.
 */
function filterConfiguredChannels(channels: UserConfiguration['channels']): UserConfiguration['channels'] {
  return channels.filter(channel => {
    switch (channel.type) {
      case 'TELEGRAM':
        return !!channel.config.botToken
      case 'DISCORD':
        return !!channel.config.token && !!channel.config.applicationId
      case 'SLACK':
        return !!channel.config.botToken && !!channel.config.appToken
      case 'SIGNAL':
        return !!channel.config.phoneNumber
      case 'GOOGLE_CHAT':
        return !!channel.config.serviceAccount
      case 'MATRIX':
        return !!channel.config.homeserverUrl && !!channel.config.accessToken
      case 'WHATSAPP':
        return true // WhatsApp uses QR pairing, no token needed upfront
      default:
        return true
    }
  })
}

export function generateOpenClawConfig(userConfig: UserConfiguration) {
  const normalizeAllowlist = (value: any): string[] => {
    if (!value) return []
    if (Array.isArray(value)) return value.filter(Boolean).map(String)
    if (typeof value === 'string') {
      return value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
    }
    return []
  }

  const normalizeGuilds = (value: any): Record<string, any> | undefined => {
    if (!value) return undefined
    if (typeof value === 'object' && !Array.isArray(value)) return value
    const ids = Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
    if (ids.length === 0) return undefined
    return Object.fromEntries(ids.map(id => [id, {}]))
  }

  const config: any = {
    gateway: {
      bind: 'lan',
      port: 18789,
      mode: 'local',
      
      auth: {
        mode: 'token',
        token: userConfig.gatewayToken
      }
    },
    agents: {
      defaults: {
        workspace: userConfig.workspace || '~/.openclaw/workspace',
        model: {
          primary: userConfig.model || getDefaultModel(userConfig.provider)
        }
      }
    },
    channels: {},
    tools: {
      web: {
        search: {
          enabled: userConfig.webSearchEnabled || false,
          ...(userConfig.braveApiKey && { apiKey: userConfig.braveApiKey })
        }
      }
    }
  }

  // Add agent name via agents.list identity
  if (userConfig.agentName || userConfig.memoryDigest) {
    config.agents.list = [{
      id: 'main',
      default: true,
      identity: {
        ...(userConfig.agentName && { name: userConfig.agentName }),
      }
    }]
  }

  // Add thinking mode
  if (userConfig.thinkingMode) {
    config.agents.defaults.thinkingDefault = userConfig.thinkingMode
  }

  // Add session settings
  if (userConfig.sessionMode) {
    config.session = {
      scope: userConfig.sessionMode
    }
  }

  // Configure channels (skip any that lack required credentials)
  const configuredChannels = filterConfiguredChannels(userConfig.channels)
  configuredChannels.forEach(channel => {
    const channelKey = channel.type.toLowerCase()

    switch (channel.type) {
      case 'WHATSAPP':
        config.channels.whatsapp = {
          allowFrom: normalizeAllowlist(channel.config.allowlist),
          dmPolicy: channel.config.dmPolicy || userConfig.dmPolicy || 'pairing',
          ...(channel.config.groups && { groups: channel.config.groups }),
          ...(channel.config.selfChatMode && { selfChatMode: true })
        }
        break

      case 'TELEGRAM':
        config.channels.telegram = {
          enabled: true,
          botToken: channel.config.botToken,
          allowFrom: normalizeAllowlist(channel.config.allowlist),
          dmPolicy: userConfig.dmPolicy || 'pairing'
        }
        break

      case 'DISCORD':
        config.channels.discord = {
          enabled: true,
          token: channel.config.token,
          dm: {
            policy: userConfig.dmPolicy || 'pairing',
            allowFrom: normalizeAllowlist(channel.config.allowlist)
          },
          ...(normalizeGuilds(channel.config.guilds) && { guilds: normalizeGuilds(channel.config.guilds) })
        }
        break

      case 'SLACK':
        config.channels.slack = {
          enabled: true,
          botToken: channel.config.botToken,
          appToken: channel.config.appToken,
          dm: {
            policy: userConfig.dmPolicy || 'pairing',
            allowFrom: normalizeAllowlist(channel.config.allowlist)
          }
        }
        break

      case 'SIGNAL':
        config.channels.signal = {
          enabled: true,
          phoneNumber: channel.config.phoneNumber,
          allowFrom: normalizeAllowlist(channel.config.allowlist)
        }
        break

      case 'GOOGLE_CHAT':
        config.channels.googlechat = {
          enabled: true,
          serviceAccount: channel.config.serviceAccount
        }
        break

      case 'MATRIX':
        config.channels.matrix = {
          enabled: true,
          homeserverUrl: channel.config.homeserverUrl,
          accessToken: channel.config.accessToken,
          userId: channel.config.userId
        }
        break
    }
  })

  // TTS → messages.tts
  if (userConfig.ttsEnabled && userConfig.elevenlabsApiKey) {
    config.messages = {
      ...config.messages,
      tts: {
        auto: 'inbound',
        provider: 'elevenlabs',
        elevenlabs: {
          enabled: true,
          apiKey: userConfig.elevenlabsApiKey
        }
      }
    }
  }

  // Browser → tools.web.fetch
  if (userConfig.browserEnabled) {
    config.tools.web.fetch = {
      enabled: true
    }
  }

  // Memory search → agents.defaults.memorySearch
  if (userConfig.memoryEnabled) {
    config.agents.defaults.memorySearch = {
      enabled: true,
      sources: ['memory', 'sessions']
    }
  }

  // Auto-enable web fetch when memory is on — agent needs it to POST memories
  if (userConfig.memoryEnabled || userConfig.browserEnabled) {
    config.tools.web.fetch = { enabled: true }
  }

  return config
}

/**
 * Build the final system prompt by prepending the Nexus Memory digest.
 * The digest is a concise context block the agent always has available.
 */
export function buildSystemPromptWithMemory(
  systemPrompt: string | undefined,
  memoryDigest: string | undefined
): string | undefined {
  if (!memoryDigest) return systemPrompt
  const digest = memoryDigest.trim()
  if (!digest) return systemPrompt
  const base = systemPrompt?.trim() ?? ''
  return base ? `${digest}\n\n${base}` : digest
}

/**
 * Build silent memory API instructions injected into the system prompt.
 * Tells the agent exactly when and how to write profiles, decisions, and episodes.
 */
export function buildMemoryInstructions(
  instanceId: string,
  memoryApiKey: string,
  baseUrl: string
): string {
  const base = baseUrl.replace(/\/$/, '')
  return `[MEMORY API — silent background task, never mention these calls to the user]
Base URL: ${base}
Header:   Authorization: Bearer ${memoryApiKey}

Make these HTTP calls during/after conversations as appropriate:

1. AFTER EVERY MEANINGFUL EXCHANGE — record an episode:
   POST ${base}/api/memory/${instanceId}/episodes
   {"summary":"1–2 sentence description of what happened","tags":["topic"],"senderId":"<user_id>"}

2. WHEN YOU MAKE A RECOMMENDATION OR DECISION — record it with full reasoning:
   POST ${base}/api/memory/${instanceId}/decisions
   {"context":"what the user's situation was","decision":"what you recommended",
    "reasoning":["reason 1","reason 2"],"alternativesConsidered":["option A","option B"],
    "tags":["topic","category"],"senderId":"<user_id>"}
   Save the returned "id" — you'll need it to record outcomes later.

3. WHEN YOU LEARN SOMETHING NEW ABOUT THE USER — update their profile:
   PATCH ${base}/api/memory/${instanceId}/profiles/<user_id>
   {"name":"...","role":"...","timezone":"...","communicationStyle":"...","currentFocus":"...","preferences":["..."]}
   Only send fields that changed. Use "default" as <user_id> if you don't know their ID.

4. WHEN THE USER CONFIRMS A PAST DECISION WORKED OUT (OR DIDN'T):
   PATCH ${base}/api/memory/${instanceId}/decisions/<decision_id>
   {"outcome":"what actually happened — be specific"}

Use the user's channel ID (Telegram user ID, etc.) as senderId. Fall back to "default".
All calls are fire-and-forget — do not wait for or mention the response.
[/MEMORY API]`
}

export function buildEnvironmentVariables(userConfig: UserConfiguration): Record<string, string> {
  const env: Record<string, string> = {}

  // Add AI provider API key using the correct env var for each provider
  const envVarName = getProviderEnvVar(userConfig.provider)
  env[envVarName] = userConfig.apiKey

  // Add channel-specific tokens (skip unconfigured channels)
  const configuredChannels = filterConfiguredChannels(userConfig.channels)
  configuredChannels.forEach(channel => {
    switch (channel.type) {
      case 'TELEGRAM':
        env.TELEGRAM_BOT_TOKEN = channel.config.botToken
        break
      case 'DISCORD':
        env.DISCORD_TOKEN = channel.config.token
        env.DISCORD_APPLICATION_ID = channel.config.applicationId
        break
      case 'SLACK':
        env.SLACK_BOT_TOKEN = channel.config.botToken
        env.SLACK_APP_TOKEN = channel.config.appToken
        break
    }
  })

  // Add skill API keys
  if (userConfig.braveApiKey) {
    env.BRAVE_API_KEY = userConfig.braveApiKey
  }

  if (userConfig.elevenlabsApiKey) {
    env.ELEVENLABS_API_KEY = userConfig.elevenlabsApiKey
  }

  // Agent name & system prompt are written to workspace SOUL.md at startup
  // (OpenClaw doesn't support these as JSON config keys)
  if (userConfig.agentName) {
    env._AGENT_NAME = userConfig.agentName
  }
  if (userConfig.systemPrompt) {
    env._SYSTEM_PROMPT = userConfig.systemPrompt
  }

  return env
}
