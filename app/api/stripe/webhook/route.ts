import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { getProvider } from '@/lib/deploy'
import { encrypt } from '@/lib/utils/encryption'
import { Plan, SubscriptionStatus, Prisma } from '@prisma/client'
import { UserConfiguration } from '@/lib/openclaw/config-builder'
import { getDefaultModel } from '@/lib/models'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!
  const stripe = getStripe()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    console.log(`📨 Webhook event received: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        // Subscription created - usually handled by checkout.session.completed
        console.log('✅ Subscription created (handled by checkout.session.completed)')
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
      case 'invoice.paid':
        // Invoice paid successfully - subscription renewal
        console.log('✅ Invoice paid successfully')
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.updated':
        // Invoice updated - log for monitoring
        console.log('📝 Invoice updated')
        break

      case 'customer.created':
        // Customer created - happens before subscription
        console.log('✅ Customer created')
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 WEBHOOK RECEIVED: checkout.session.completed')
  console.log('Session metadata:', session.metadata)

  const stripe = getStripe()
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    console.error('❌ Missing metadata in checkout session')
    return
  }

  console.log(`✅ Processing payment for user: ${userId}, plan: ${plan}`)

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // Map plan string to enum
  const planEnum = plan === 'MONTHLY' ? Plan.MONTHLY : Plan.YEARLY

  // Create or update subscription
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: planEnum,
      status: SubscriptionStatus.ACTIVE
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: planEnum,
      status: SubscriptionStatus.ACTIVE
    }
  })

  // Get user's configuration from database
  console.log('📦 Fetching user configuration from database...')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pendingConfig: true }
  })

  const config = user?.pendingConfig

  const isValidUserConfiguration = (value: unknown): value is UserConfiguration => {
    return (
      !!value &&
      typeof value === 'object' &&
      'apiKey' in value &&
      'provider' in value &&
      'channels' in value &&
      Array.isArray((value as any).channels)
    )
  }

  if (!isValidUserConfiguration(config)) {
    console.error('❌ Invalid or missing configuration for user:', userId)
    console.error('User found:', !!user)
    console.error('PendingConfig:', user?.pendingConfig)
    return
  }

  console.log('✅ Configuration found, starting deployment...')

  // Encrypt API keys before storing
  const encryptedApiKey = encrypt(config.apiKey)

  // Deploy OpenClaw instance
  try {
    const deployment = await getProvider().deploy(userId, config)

    // Save configuration to database
    await prisma.configuration.create({
      data: {
        instanceId: deployment.instanceId,
        provider: config.provider,
        apiKey: encryptedApiKey,
        model: config.model || getDefaultModel(config.provider),
        webSearchEnabled: config.webSearchEnabled || false,
        braveApiKey: config.braveApiKey ? encrypt(config.braveApiKey) : null,
        browserEnabled: config.browserEnabled || false,
        ttsEnabled: config.ttsEnabled || false,
        elevenlabsApiKey: config.elevenlabsApiKey ? encrypt(config.elevenlabsApiKey) : null,
        canvasEnabled: config.canvasEnabled || false,
        cronEnabled: config.cronEnabled || false,
        memoryEnabled: config.memoryEnabled || false,
        workspace: config.workspace,
        agentName: config.agentName,
        systemPrompt: config.systemPrompt,
        thinkingMode: config.thinkingMode || 'high',
        sessionMode: config.sessionMode || 'per-sender',
        dmPolicy: config.dmPolicy || 'pairing',
        fullConfig: config,
        channels: {
          create: config.channels.map((channel: any) => ({
            type: channel.type,
            enabled: true,
            config: channel.config,
            botUsername: channel.config.botUsername,
            phoneNumber: channel.config.phoneNumber,
            inviteLink: channel.config.inviteLink
          }))
        }
      }
    })

    // Clean up pending config from database
    await prisma.user.update({
      where: { id: userId },
      data: { pendingConfig: Prisma.DbNull }
    })

    console.log(`🚀 Successfully deployed instance for user ${userId}`)
    console.log(`   Instance ID: ${deployment.instanceId}`)
    console.log(`   Container ID: ${deployment.containerId}`)

  } catch (error) {
    console.error('❌ Deployment failed:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    // TODO: Send notification to admin and user
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!dbSubscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Map Stripe status to our enum
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    canceled: SubscriptionStatus.CANCELED,
    past_due: SubscriptionStatus.PAST_DUE,
    incomplete: SubscriptionStatus.INCOMPLETE,
    trialing: SubscriptionStatus.TRIALING,
    unpaid: SubscriptionStatus.UNPAID
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: statusMap[subscription.status] || SubscriptionStatus.ACTIVE,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: { include: { instance: true } } }
  })

  if (!dbSubscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: SubscriptionStatus.CANCELED }
  })

  // Stop and remove instance
  if (dbSubscription.user.instance) {
    // TODO: Implement instance cleanup
    // - Stop container
    // - Remove container
    // - Remove volumes
    console.log(`TODO: Clean up instance for user ${dbSubscription.userId}`)
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!dbSubscription) {
    console.log('Invoice paid for unknown customer (possibly first payment):', customerId)
    return
  }

  // Update subscription period end if available
  if (invoice.lines.data[0]?.period?.end) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        stripeCurrentPeriodEnd: new Date(invoice.lines.data[0].period.end * 1000),
        status: SubscriptionStatus.ACTIVE
      }
    })
    console.log(`✅ Updated subscription period for user ${dbSubscription.userId}`)
  }
}
