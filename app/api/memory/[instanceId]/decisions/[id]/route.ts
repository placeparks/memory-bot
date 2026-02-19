import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getDecisionById, updateDecisionOutcome } from '@/lib/memory/stores/decision'

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

export async function GET(
  req: NextRequest,
  { params }: { params: { instanceId: string; id: string } }
) {
  const { instanceId, id } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decision = await getDecisionById(id)
  if (!decision || decision.instanceId !== instanceId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ decision })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { instanceId: string; id: string } }
) {
  const { instanceId, id } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { outcome } = await req.json()
  if (!outcome) return NextResponse.json({ error: 'outcome required' }, { status: 400 })

  const decision = await getDecisionById(id)
  if (!decision || decision.instanceId !== instanceId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await updateDecisionOutcome(id, outcome)
  return NextResponse.json({ success: true })
}
