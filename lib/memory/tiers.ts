import { TierLimits, MemoryTier } from './types'

export const TIER_LIMITS: Record<MemoryTier, TierLimits> = {
  STANDARD: {
    retentionDays: 30,
    maxEntities: 100,
    maxDocumentsMB: 500,
    maxEventsPerMonth: 5000,
  },
  PRO: {
    retentionDays: null,    // unlimited
    maxEntities: null,      // unlimited
    maxDocumentsMB: 10240,  // 10 GB
    maxEventsPerMonth: 100000,
  },
}

export function getTierLimits(tier: MemoryTier): TierLimits {
  return TIER_LIMITS[tier]
}

export function getExpiryDate(tier: MemoryTier): Date | null {
  const limits = getTierLimits(tier)
  if (!limits.retentionDays) return null
  const d = new Date()
  d.setDate(d.getDate() + limits.retentionDays)
  return d
}
