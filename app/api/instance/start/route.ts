import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getProvider } from '@/lib/deploy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json(
        { error: 'No instance found' },
        { status: 404 }
      )
    }

    await getProvider().start(user.instance.id)

    return NextResponse.json({
      success: true,
      message: 'Instance started successfully'
    })

  } catch (error: any) {
    console.error('Start instance error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
