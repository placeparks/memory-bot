import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RailwayClient } from '@/lib/railway/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CODE_PATTERN = /^[A-Za-z0-9_-]{2,32}$/
const CHANNELS = new Set(['telegram'])

const PAIRING_SERVICE_URL = process.env.PAIRING_SERVICE_URL
const PAIRING_SERVICE_API_KEY = process.env.PAIRING_SERVICE_API_KEY

// Get gateway token from Railway service env vars
async function getGatewayToken(serviceId: string): Promise<string | null> {
  try {
    const railway = new RailwayClient()
    const variables = await railway.getVariables(serviceId)
    return variables.OPENCLAW_GATEWAY_TOKEN || null
  } catch (error) {
    console.error('[Pairing] Failed to get gateway token:', error)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const channel = String(body?.channel || '').toLowerCase()
    const code = String(body?.code || '').trim()

    if (!CHANNELS.has(channel)) {
      return NextResponse.json({ error: 'Unsupported channel' }, { status: 400 })
    }

    if (!CODE_PATTERN.test(code)) {
      return NextResponse.json({ error: 'Invalid pairing code' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    if (!user.instance.containerId) {
      return NextResponse.json({ error: 'Instance has no Railway service ID' }, { status: 400 })
    }

    const cliCommand = `openclaw pairing approve ${channel} ${code}`
    const serviceId = user.instance.containerId

    // Try pairing microservice if configured
    if (PAIRING_SERVICE_URL && PAIRING_SERVICE_API_KEY) {
      try {
        console.log('[Pairing] Getting gateway token from Railway...')
        const gatewayToken = await getGatewayToken(serviceId)
        console.log('[Pairing] Gateway token:', gatewayToken ? 'found' : 'not found')

        console.log('[Pairing] Calling pairing microservice...')
        const response = await fetch(`${PAIRING_SERVICE_URL}/pairing/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PAIRING_SERVICE_API_KEY}`
          },
          body: JSON.stringify({
            serviceId,
            channel,
            code,
            gatewayToken
          }),
          signal: AbortSignal.timeout(30000)
        })

        const result = await response.json()
        console.log('[Pairing] Microservice response:', result)

        if (response.ok && result.success) {
          return NextResponse.json({
            success: true,
            message: result.message || 'Pairing approved successfully!',
            output: result.output || result.result
          })
        }

        // Microservice returned error - log and fall through to manual
        console.log('[Pairing] Microservice failed:', result)
      } catch (error: any) {
        console.error('[Pairing] Microservice error:', error.message)
        // Fall through to manual instructions
      }
    } else {
      console.log('[Pairing] Microservice not configured, showing manual instructions')
    }

    // Fallback: Manual CLI instructions
    return NextResponse.json({
      success: true,
      cliCommand,
      message: 'Copy and run this command in Railway Terminal',
      instructions: [
        '1. Go to Railway Dashboard',
        '2. Open your OpenClaw service → Deployments',
        '3. Click active deployment → Terminal',
        '4. Paste and run the command above'
      ]
    })

  } catch (error: any) {
    console.error('Pairing error:', error)
    return NextResponse.json(
      { error: error.message || 'Pairing failed' },
      { status: 500 }
    )
  }
}
