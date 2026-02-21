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
    include: { instance: true },
  })

  if (!user?.instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  const config = await getConfigForDisplay(user.instance.id)
  const canvasEnabled = config?.canvasEnabled ?? false

  let isRunning = false
  if (canvasEnabled && user.instance.accessUrl) {
    const base = user.instance.accessUrl.replace(/\/$/, '')
    try {
      const res = await fetch(`${base}/canvas/__openclaw__/canvas/`, {
        signal: AbortSignal.timeout(3000),
      })
      isRunning = res.status < 500
    } catch {
      isRunning = false
    }
  }

  return NextResponse.json({ canvasEnabled, isRunning })
}
