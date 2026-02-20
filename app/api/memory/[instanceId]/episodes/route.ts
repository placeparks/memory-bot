import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storeEpisode, getEpisodes } from '@/lib/memory/stores/episodes'

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
  const senderId = url.searchParams.get('senderId') ?? undefined
  const since = url.searchParams.get('since') ? new Date(url.searchParams.get('since')!) : undefined

  const episodes = await getEpisodes(instanceId, { limit, senderId, since })
  return NextResponse.json({ episodes })
}

export async function POST(req: NextRequest, { params }: { params: { instanceId: string } }) {
  const { instanceId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { summary, tags, senderId, happenedAt } = body

  if (!summary) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 })
  }

  const episode = await storeEpisode({
    instanceId,
    senderId,
    summary,
    tags,
    happenedAt: happenedAt ? new Date(happenedAt) : undefined,
  })

  return NextResponse.json({ episode })
}
