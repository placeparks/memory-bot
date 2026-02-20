import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProfile, upsertProfile, deleteProfile } from '@/lib/memory/stores/profiles'

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
  { params }: { params: { instanceId: string; senderId: string } }
) {
  const { instanceId, senderId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await getProfile(instanceId, senderId)
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ profile })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { instanceId: string; senderId: string } }
) {
  const { instanceId, senderId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const profile = await upsertProfile({ ...body, instanceId, senderId })
  return NextResponse.json({ profile })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { instanceId: string; senderId: string } }
) {
  const { instanceId, senderId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await deleteProfile(instanceId, senderId)
  return NextResponse.json({ success: true })
}
