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

  if (!user?.instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  const accessUrl = user.instance.accessUrl?.replace(/\/$/, '')
  if (!accessUrl) {
    return NextResponse.json({ error: 'No public URL for instance' }, { status: 503 })
  }

  // Route through the pairing server's /canvas proxy (port 18800, public).
  // The pairing server forwards /canvas/* → localhost:18789/* (gateway).
  // pathStr preserves the full path (e.g. __openclaw__/canvas/page.html).
  const pathStr = (params.path ?? []).join('/')
  const upstreamUrl = `${accessUrl}/canvas/${pathStr}`

  try {
    const upstreamRes = await fetch(upstreamUrl, {
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
