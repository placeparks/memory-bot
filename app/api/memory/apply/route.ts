import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadConfigFromDB, } from '@/lib/deploy/config-updater'
import { generateOpenClawConfig, buildSystemPromptWithMemory } from '@/lib/openclaw/config-builder'
import { getProvider } from '@/lib/deploy'
import { buildMemoryDigest } from '@/lib/memory/processing/digest-builder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: { include: { config: true } } },
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    if (!user.instance.config?.memoryEnabled) {
      return NextResponse.json({ error: 'Memory is not enabled for this agent' }, { status: 400 })
    }

    const instanceId = user.instance.id

    // Build fresh memory digest from uploaded documents
    const digest = await buildMemoryDigest(instanceId)

    // Load full config and inject digest
    const userConfig = await loadConfigFromDB(instanceId)
    if (digest) {
      userConfig.systemPrompt = buildSystemPromptWithMemory(userConfig.systemPrompt, digest)
      userConfig.memoryDigest = digest
    }

    // Regenerate OpenClaw config and persist
    const openclawConfig = generateOpenClawConfig(userConfig)
    await prisma.configuration.update({
      where: { instanceId },
      data: { fullConfig: openclawConfig },
    })

    // Push to running container
    await getProvider().updateConfig(instanceId, userConfig)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Memory Apply] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to apply' }, { status: 500 })
  }
}
