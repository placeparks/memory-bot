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
    include: {
      instance: {
        include: { config: true },
      },
    },
  })

  if (!user?.instance?.serviceUrl) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  const gatewayToken = user.instance.config?.gatewayToken ?? null
  const pathStr = (params.path ?? []).join('/')

  // Canvas is served through the gateway at /__openclaw__/canvas/
  // (canvasHost only binds to localhost inside the container)
  const gatewayBase = user.instance.serviceUrl.replace(/\/$/, '')
  const upstreamUrl = `${gatewayBase}/__openclaw__/canvas/${pathStr}`

  try {
    const headers: Record<string, string> = {}
    if (gatewayToken) {
      headers['Authorization'] = `Bearer ${gatewayToken}`
    }

    const upstreamRes = await fetch(upstreamUrl, {
      headers,
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
