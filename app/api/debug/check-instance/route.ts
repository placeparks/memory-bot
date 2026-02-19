import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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
      include: {
        instance: true,
        subscription: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check all instances in database
    const allInstances = await prisma.instance.findMany({
      select: {
        id: true,
        userId: true,
        containerName: true,
        status: true,
        containerId: true,
        accessUrl: true,
        serviceUrl: true
      }
    })

    return NextResponse.json({
      debug: {
        userEmail: user.email,
        userId: user.id,
        hasInstance: !!user.instance,
        hasSubscription: !!user.subscription,
        instance: user.instance ? {
          id: user.instance.id,
          userId: user.instance.userId,
          containerName: user.instance.containerName,
          status: user.instance.status,
          containerId: user.instance.containerId,
          accessUrl: user.instance.accessUrl,
          serviceUrl: user.instance.serviceUrl
        } : null,
        subscription: user.subscription ? {
          plan: user.subscription.plan,
          status: user.subscription.status
        } : null,
        allInstances: allInstances
      }
    })

  } catch (error: any) {
    console.error('Debug check error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
