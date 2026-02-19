/**
 * Test script to simulate webhook deployment
 * Run with: npx tsx test-webhook.ts
 */

import { prisma } from './lib/prisma'
import { deployInstance } from './lib/railway/deploy'
import { encrypt } from './lib/utils/encryption'
import { AIProvider, ChannelType, Prisma } from '@prisma/client'
import { UserConfiguration } from './lib/openclaw/config-builder'

async function testDeployment() {
  const testConfig: UserConfiguration = {
    model: '',
    apiKey: process.env.OPENAI_API_KEY || 'sk_test_placeholder',
    channels: [{
      type: ChannelType.DISCORD,
      config: {
        token: process.env.DISCORD_BOT_TOKEN || 'discord_token_placeholder',
        applicationId: process.env.DISCORD_APPLICATION_ID || 'discord_app_id_placeholder',
      },
    }],
    provider: AIProvider.OPENAI,
    ttsEnabled: false,
    braveApiKey: '',
    cronEnabled: false,
    canvasEnabled: false,
    memoryEnabled: false,
    browserEnabled: false,
    elevenlabsApiKey: '',
    webSearchEnabled: false,
  }

  try {
    // Get your user from database
    console.log('Looking for user...')
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'desc' },
    })

    if (!user) {
      console.error('No user found in database')
      return
    }

    console.log(`Found user: ${user.email} (${user.id})`)

    // Store config as pendingConfig
    console.log('Storing pendingConfig...')
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingConfig: testConfig as any },
    })

    console.log('Starting deployment...')

    // Deploy instance
    const deployment = await deployInstance(user.id, testConfig)

    // Encrypt and save configuration
    const encryptedApiKey = encrypt(testConfig.apiKey)

    await prisma.configuration.create({
      data: {
        instanceId: deployment.instanceId,
        provider: testConfig.provider as any,
        apiKey: encryptedApiKey,
        model: testConfig.model || 'gpt-4',
        webSearchEnabled: testConfig.webSearchEnabled || false,
        braveApiKey: testConfig.braveApiKey ? encrypt(testConfig.braveApiKey) : null,
        browserEnabled: testConfig.browserEnabled || false,
        ttsEnabled: testConfig.ttsEnabled || false,
        elevenlabsApiKey: testConfig.elevenlabsApiKey ? encrypt(testConfig.elevenlabsApiKey) : null,
        canvasEnabled: testConfig.canvasEnabled || false,
        cronEnabled: testConfig.cronEnabled || false,
        memoryEnabled: testConfig.memoryEnabled || false,
        workspace: (testConfig as any).workspace,
        agentName: (testConfig as any).agentName,
        systemPrompt: (testConfig as any).systemPrompt,
        thinkingMode: (testConfig as any).thinkingMode || 'high',
        sessionMode: (testConfig as any).sessionMode || 'per-sender',
        dmPolicy: (testConfig as any).dmPolicy || 'pairing',
        fullConfig: testConfig as any,
        channels: {
          create: testConfig.channels.map((channel: any) => ({
            type: channel.type,
            enabled: true,
            config: channel.config,
            botUsername: channel.config.botUsername,
            phoneNumber: channel.config.phoneNumber,
            inviteLink: channel.config.inviteLink,
          })),
        },
      },
    })

    // Clear pendingConfig
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingConfig: Prisma.DbNull },
    })

    console.log('\nSUCCESS!')
    console.log(`  Instance ID: ${deployment.instanceId}`)
    console.log(`  Container ID: ${deployment.containerId}`)
    console.log('\nYour Discord bot should now be online!')
  } catch (error) {
    console.error('Deployment failed:', error)
    if (error instanceof Error) {
      console.error('  Error message:', error.message)
      console.error('  Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testDeployment()
