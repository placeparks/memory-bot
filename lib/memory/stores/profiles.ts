import { prisma } from '@/lib/prisma'
import { ProfileData, ProfileRow } from '../types'

export async function upsertProfile(data: ProfileData): Promise<ProfileRow> {
  const senderId = data.senderId ?? 'default'
  return (prisma as any).memoryProfile.upsert({
    where: {
      instanceId_senderId: { instanceId: data.instanceId, senderId },
    },
    update: {
      name: data.name,
      role: data.role,
      communicationStyle: data.communicationStyle,
      timezone: data.timezone,
      currentFocus: data.currentFocus,
      relationshipContext: data.relationshipContext,
      preferences: data.preferences,
      metadata: data.metadata,
      updatedAt: new Date(),
    },
    create: {
      instanceId: data.instanceId,
      senderId,
      name: data.name,
      role: data.role,
      communicationStyle: data.communicationStyle,
      timezone: data.timezone,
      currentFocus: data.currentFocus,
      relationshipContext: data.relationshipContext,
      preferences: data.preferences ?? [],
      metadata: data.metadata,
    },
  })
}

export async function getProfile(instanceId: string, senderId = 'default'): Promise<ProfileRow | null> {
  return (prisma as any).memoryProfile.findUnique({
    where: { instanceId_senderId: { instanceId, senderId } },
  })
}

export async function getAllProfiles(instanceId: string): Promise<ProfileRow[]> {
  return (prisma as any).memoryProfile.findMany({
    where: { instanceId },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function deleteProfile(instanceId: string, senderId = 'default'): Promise<void> {
  await (prisma as any).memoryProfile.delete({
    where: { instanceId_senderId: { instanceId, senderId } },
  })
}
