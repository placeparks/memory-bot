import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { instance: true },
  })

  if (!user?.instance?.serviceUrl) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  let canvasBase: string
  try {
    const parsed = new URL(user.instance.serviceUrl)
    parsed.port = '18793'
    canvasBase = parsed.origin
  } catch {
    return NextResponse.json({ error: 'Invalid serviceUrl' }, { status: 500 })
  }

  const pathStr = (params.path ?? []).join('/')

  try {
    const upstreamRes = await fetch(`${canvasBase}/${pathStr}`, {
      signal: AbortSignal.timeout(10000),
    })

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') ?? 'text/html',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Canvas server unreachable', detail: err.message },
      { status: 503 }
    )
  }
}
