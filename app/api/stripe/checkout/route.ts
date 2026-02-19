import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe, PLANS } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function fetchTelegramUsername(botToken: string): Promise<string | null> {
  if (!botToken) return null

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      method: 'GET',
      cache: 'no-store'
    })

    if (!response.ok) return null

    const data = await response.json()
    if (data?.ok && data?.result?.username) {
      return `@${data.result.username}`
    }
  } catch {
    // Non-fatal: proceed without username enrichment.
  }

  return null
}

async function enrichChannelConfig(config: any) {
  if (!config?.channels || !Array.isArray(config.channels)) return config

  const channels = await Promise.all(
    config.channels.map(async (channel: any) => {
      if (channel?.type !== 'TELEGRAM') return channel

      const botToken = channel?.config?.botToken
      if (!botToken) return channel

      const botUsername = await fetchTelegramUsername(botToken)
      if (!botUsername) return channel

      return {
        ...channel,
        config: {
          ...channel.config,
          botUsername
        }
      }
    })
  )

  return { ...config, channels }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { plan, config } = await req.json()

    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create or get Stripe customer
    const stripe = getStripe()
    let customerId = ''

    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: user.id }
    })

    if (existingSubscription) {
      customerId = existingSubscription.stripeCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      })
      customerId = customer.id
    }

    const enrichedConfig = await enrichChannelConfig(config)

    // Store config in database (we'll use it after payment success)
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingConfig: enrichedConfig }
    })

    // Create Stripe checkout session
    const selectedPlan = PLANS[plan as keyof typeof PLANS]
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan
      }
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
