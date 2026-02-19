import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getMemoryStats, getOrCreateMemoryConfig } from '@/lib/memory'

async function verifyAccess(instanceId: string, req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, user: { email: session.user.email } },
    })
    if (instance) return true
  }
  const auth = req.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const key = auth.slice(7)
    const cfg = await (prisma as any).memoryConfig.findFirst({ where: { instanceId, memoryApiKey: key } })
    if (cfg) return true
  }
  return false
}

export async function GET(req: NextRequest, { params }: { params: { instanceId: string } }) {
  const { instanceId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stats = await getMemoryStats(instanceId)
  return NextResponse.json({ stats })
}
