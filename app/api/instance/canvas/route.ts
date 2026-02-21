import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConfigForDisplay } from '@/lib/deploy/config-updater'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      instance: {
        include: { config: true },
      },
    },
  })

  if (!user?.instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  const config = await getConfigForDisplay(user.instance.id)
  const canvasEnabled = config?.canvasEnabled ?? false

  let isRunning = false
  if (canvasEnabled && user.instance.serviceUrl) {
    const gatewayToken = user.instance.config?.gatewayToken ?? null
    const gatewayBase = user.instance.serviceUrl.replace(/\/$/, '')

    try {
      const headers: Record<string, string> = {}
      if (gatewayToken) {
        headers['Authorization'] = `Bearer ${gatewayToken}`
      }

      const res = await fetch(`${gatewayBase}/__openclaw__/canvas/`, {
        headers,
        signal: AbortSignal.timeout(3000),
      })
      isRunning = res.status < 500
    } catch {
      isRunning = false
    }
  }

  return NextResponse.json({ canvasEnabled, isRunning })
}
