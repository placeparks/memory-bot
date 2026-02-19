import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  })

  return stripeClient
}

export const PLANS = {
  MONTHLY: {
    name: 'Monthly',
    price: 29,
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
    interval: 'month' as const,
  },
  YEARLY: {
    name: 'Yearly',
    price: 299,
    pricePerMonth: 24.92,
    savings: 49,
    discount: 14,
    priceId: process.env.STRIPE_PRICE_YEARLY!,
    interval: 'year' as const,
  },
}
