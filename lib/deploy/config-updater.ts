import { prisma } from '@/lib/prisma'
import { getProvider } from './index'
import {
  generateOpenClawConfig,
  buildSystemPromptWithMemory,
  buildMemoryInstructions,
  UserConfiguration,
} from '@/lib/openclaw/config-builder'
import { decrypt, encrypt } from '@/lib/utils/encryption'
import { AIProvider, ChannelType } from '@prisma/client'

/**
 * Reconstruct a UserConfiguration from the database Configuration + Channel records.
 * This is the inverse of what the Stripe webhook does when saving config.
 */
export async function loadConfigFromDB(instanceId: string): Promise<UserConfiguration> {
  const config = await prisma.configuration.findUnique({
    where: { instanceId },
    include: { channels: true },
  })

  if (!config) throw new Error('Configuration not found for instance')

  return {
    provider: config.provider,
    apiKey: decrypt(config.apiKey),
    model: config.model,
    channels: config.channels.map(ch => ({
      type: ch.type,
      config: ch.config as Record<string, any>,
    })),
    webSearchEnabled: config.webSearchEnabled,
    braveApiKey: config.braveApiKey ? decrypt(config.braveApiKey) : undefined,
    browserEnabled: config.browserEnabled,
    ttsEnabled: config.ttsEnabled,
    elevenlabsApiKey: config.elevenlabsApiKey ? decrypt(config.elevenlabsApiKey) : undefined,
    canvasEnabled: config.canvasEnabled,
    cronEnabled: config.cronEnabled,
    memoryEnabled: config.memoryEnabled,
    workspace: config.workspace || undefined,
    agentName: config.agentName || undefined,
    systemPrompt: config.systemPrompt || undefined,
    thinkingMode: config.thinkingMode,
    sessionMode: config.sessionMode,
    dmPolicy: config.dmPolicy,
    gatewayToken: (config as any).gatewayToken || undefined,
  }
}

/**
 * Get the current config for display in the settings UI.
 * API keys are masked for security.
 */
export async function getConfigForDisplay(instanceId: string) {
  const config = await prisma.configuration.findUnique({
    where: { instanceId },
    include: { channels: true },
  })

  if (!config) return null

  const maskKey = (key: string | null) => {
    if (!key) return null
    try {
      const decrypted = decrypt(key)
      if (decrypted.length <= 8) return '****'
      return decrypted.slice(0, 4) + '...' + decrypted.slice(-4)
    } catch {
      return '****'
    }
  }

  return {
    provider: config.provider,
    apiKey: maskKey(config.apiKey),
    model: config.model,
    channels: config.channels.map(ch => ({
      id: ch.id,
      type: ch.type,
      enabled: ch.enabled,
      config: ch.config as Record<string, any>,
      botUsername: ch.botUsername,
      phoneNumber: ch.phoneNumber,
      inviteLink: ch.inviteLink,
    })),
    webSearchEnabled: config.webSearchEnabled,
    braveApiKey: maskKey(config.braveApiKey),
    browserEnabled: config.browserEnabled,
    ttsEnabled: config.ttsEnabled,
    elevenlabsApiKey: maskKey(config.elevenlabsApiKey),
    canvasEnabled: config.canvasEnabled,
    cronEnabled: config.cronEnabled,
    memoryEnabled: config.memoryEnabled,
    workspace: config.workspace,
    agentName: config.agentName,
    systemPrompt: config.systemPrompt,
    thinkingMode: config.thinkingMode,
    sessionMode: config.sessionMode,
    dmPolicy: config.dmPolicy,
  }
}

export interface AgentConfigUpdate {
  agentName?: string
  systemPrompt?: string
  provider?: AIProvider
  apiKey?: string // Only set if user provides new key
  model?: string
  thinkingMode?: string
}

export interface ChannelConfigUpdate {
  add?: { type: ChannelType; config: Record<string, any> }[]
  update?: { id: string; config: Record<string, any> }[]
  remove?: string[] // Channel IDs to remove
}

export interface SkillsConfigUpdate {
  webSearchEnabled?: boolean
  braveApiKey?: string
  browserEnabled?: boolean
  ttsEnabled?: boolean
  elevenlabsApiKey?: string
  canvasEnabled?: boolean
  cronEnabled?: boolean
  memoryEnabled?: boolean
}

export interface SecurityConfigUpdate {
  dmPolicy?: string
  sessionMode?: string
  // Per-channel allowlist updates are handled via channel config updates
}

/**
 * Apply agent configuration changes and redeploy.
 */
export async function applyAgentUpdate(instanceId: string, changes: AgentConfigUpdate) {
  const config = await prisma.configuration.findUnique({ where: { instanceId } })
  if (!config) throw new Error('Configuration not found')

  const updateData: any = {}
  if (changes.agentName !== undefined) updateData.agentName = changes.agentName
  if (changes.systemPrompt !== undefined) updateData.systemPrompt = changes.systemPrompt
  if (changes.provider !== undefined) updateData.provider = changes.provider
  if (changes.apiKey) updateData.apiKey = encrypt(changes.apiKey)
  if (changes.model !== undefined) updateData.model = changes.model
  if (changes.thinkingMode !== undefined) updateData.thinkingMode = changes.thinkingMode

  await prisma.configuration.update({ where: { instanceId }, data: updateData })

  // Rebuild full config and apply
  await rebuildAndApply(instanceId)

  await logConfigChange(instanceId, 'agent', 'update')
}

/**
 * Apply channel configuration changes and redeploy.
 */
export async function applyChannelUpdate(instanceId: string, changes: ChannelConfigUpdate) {
  const config = await prisma.configuration.findUnique({
    where: { instanceId },
    include: { channels: true },
  })
  if (!config) throw new Error('Configuration not found')

  // Remove channels
  if (changes.remove?.length) {
    await prisma.channel.deleteMany({
      where: { id: { in: changes.remove }, configId: config.id },
    })
  }

  // Update existing channels
  if (changes.update?.length) {
    for (const ch of changes.update) {
      await prisma.channel.update({
        where: { id: ch.id },
        data: { config: ch.config },
      })
    }
  }

  // Add new channels
  if (changes.add?.length) {
    await prisma.channel.createMany({
      data: changes.add.map(ch => ({
        configId: config.id,
        type: ch.type,
        enabled: true,
        config: ch.config,
      })),
    })
  }

  await rebuildAndApply(instanceId)

  await logConfigChange(instanceId, 'channels', 'update')
}

/**
 * Apply skills configuration changes and redeploy.
 */
export async function applySkillsUpdate(instanceId: string, changes: SkillsConfigUpdate) {
  const updateData: any = {}

  if (changes.webSearchEnabled !== undefined) updateData.webSearchEnabled = changes.webSearchEnabled
  if (changes.braveApiKey) updateData.braveApiKey = encrypt(changes.braveApiKey)
  if (changes.browserEnabled !== undefined) updateData.browserEnabled = changes.browserEnabled
  if (changes.ttsEnabled !== undefined) updateData.ttsEnabled = changes.ttsEnabled
  if (changes.elevenlabsApiKey) updateData.elevenlabsApiKey = encrypt(changes.elevenlabsApiKey)
  if (changes.canvasEnabled !== undefined) updateData.canvasEnabled = changes.canvasEnabled
  if (changes.cronEnabled !== undefined) updateData.cronEnabled = changes.cronEnabled
  if (changes.memoryEnabled !== undefined) updateData.memoryEnabled = changes.memoryEnabled

  await prisma.configuration.update({ where: { instanceId }, data: updateData })

  await rebuildAndApply(instanceId)

  await logConfigChange(instanceId, 'skills', 'update')
}

/**
 * Apply security configuration changes and redeploy.
 */
export async function applySecurityUpdate(instanceId: string, changes: SecurityConfigUpdate) {
  const updateData: any = {}
  if (changes.dmPolicy !== undefined) updateData.dmPolicy = changes.dmPolicy
  if (changes.sessionMode !== undefined) updateData.sessionMode = changes.sessionMode

  await prisma.configuration.update({ where: { instanceId }, data: updateData })

  await rebuildAndApply(instanceId)

  await logConfigChange(instanceId, 'security', 'update')
}

/**
 * Rebuild the full OpenClaw config from DB and push it to the running container.
 */
async function rebuildAndApply(instanceId: string) {
  // Load current full config from DB
  const userConfig = await loadConfigFromDB(instanceId)

  // Inject Nexus Memory digest + API instructions into system prompt (if memory is enabled)
  if (userConfig.memoryEnabled) {
    try {
      const { buildMemoryDigest } = await import('@/lib/memory/processing/digest-builder')
      const { getOrCreateMemoryConfig } = await import('@/lib/memory')

      const baseUrl = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')

      const [digest, memConfig] = await Promise.all([
        buildMemoryDigest(instanceId),
        getOrCreateMemoryConfig(instanceId),
      ])

      // Prepend digest (what the agent knows)
      if (digest) {
        userConfig.systemPrompt = buildSystemPromptWithMemory(userConfig.systemPrompt, digest)
        userConfig.memoryDigest = digest
      }

      // Append write instructions (how the agent updates memory)
      if (baseUrl && memConfig?.memoryApiKey) {
        const instructions = buildMemoryInstructions(instanceId, memConfig.memoryApiKey, baseUrl)
        userConfig.systemPrompt = userConfig.systemPrompt
          ? `${userConfig.systemPrompt}\n\n${instructions}`
          : instructions
      }
    } catch (err) {
      // Non-fatal — memory is best-effort
      console.warn('[Memory] Digest/instructions build skipped:', err)
    }
  }

  // Regenerate OpenClaw config JSON
  const openclawConfig = generateOpenClawConfig(userConfig)

  // Update fullConfig in DB
  await prisma.configuration.update({
    where: { instanceId },
    data: { fullConfig: openclawConfig },
  })

  // Update instance metadata
  await prisma.instance.update({
    where: { id: instanceId },
    data: {
      updatedAt: new Date(),
    },
  })

  // Apply to running container via the provider
  const provider = getProvider()
  await provider.updateConfig(instanceId, userConfig)
}

/** Log a config change (best-effort — table may not exist until migration runs). */
async function logConfigChange(instanceId: string, field: string, action: string) {
  try {
    await (prisma as any).configChangeLog?.create?.({
      data: { instanceId, field, action, status: 'applied' },
    })
  } catch {
    // Table might not exist yet — log to deployment log instead
    await prisma.deploymentLog.create({
      data: { instanceId, action: 'CONFIG_UPDATE', status: 'SUCCESS', message: `Updated ${field}` },
    })
  }
}
