import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteDocument } from '@/lib/memory/stores/documents'

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { instanceId: string; id: string } }
) {
  const { instanceId, id } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const doc = await (prisma as any).knowledgeDocument.findUnique({ where: { id } })
  if (!doc || doc.instanceId !== instanceId)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteDocument(id)
  return NextResponse.json({ success: true })
}
