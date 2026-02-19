import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEntityById } from '@/lib/memory/stores/semantic'

async function verifyAccess(instanceId: string, req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, user: { email: session.user.email } },
    })
    if (instance) return true
  }
  return false
}

export async function GET(
  req: NextRequest,
  { params }: { params: { instanceId: string; id: string } }
) {
  const { instanceId, id } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const entity = await getEntityById(id)
  if (!entity || entity.instanceId !== instanceId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ entity })
}
