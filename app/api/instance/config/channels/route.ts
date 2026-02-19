import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyChannelUpdate, ChannelConfigUpdate } from '@/lib/deploy/config-updater'
import { ChannelType } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CHANNEL_TYPES: string[] = [
  'WHATSAPP', 'TELEGRAM', 'DISCORD', 'SLACK', 'SIGNAL',
  'GOOGLE_CHAT', 'IMESSAGE', 'MATRIX', 'MSTEAMS',
]

export async function PUT(req: Request) {
  try {
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

    const body: ChannelConfigUpdate = await req.json()

    // Validate channel types for new channels
    if (body.add?.length) {
      for (const ch of body.add) {
        if (!VALID_CHANNEL_TYPES.includes(ch.type)) {
          return NextResponse.json({ error: `Invalid channel type: ${ch.type}` }, { status: 400 })
        }
      }
    }

    await applyChannelUpdate(user.instance.id, body)

    return NextResponse.json({
      success: true,
      message: 'Channel configuration updated. Instance is restarting...',
    })
  } catch (error: any) {
    console.error('Channel config update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
