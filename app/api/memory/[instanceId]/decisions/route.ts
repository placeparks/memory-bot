import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storeDecision } from '@/lib/memory'
import { getDecisions } from '@/lib/memory/stores/decision'

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

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')

  const decisions = await getDecisions(instanceId, limit, offset)
  return NextResponse.json({ decisions })
}

export async function POST(req: NextRequest, { params }: { params: { instanceId: string } }) {
  const { instanceId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    decision, reasoning, confidence, channel, senderId, sessionId,
    contextSnapshot, modelUsed, tokensUsed, entitiesInvolved, documentsUsed,
  } = body

  if (!decision || !Array.isArray(reasoning)) {
    return NextResponse.json({ error: 'decision and reasoning[] required' }, { status: 400 })
  }

  const id = await storeDecision({
    instanceId, decision, reasoning, confidence, channel, senderId, sessionId,
    contextSnapshot, modelUsed, tokensUsed, entitiesInvolved, documentsUsed,
  })

  return NextResponse.json({ id })
}
