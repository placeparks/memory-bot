import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const instances = await prisma.instance.findMany({
      where: {
        status: { in: ['RUNNING', 'DEPLOYING'] },
      },
      include: {
        config: {
          include: { channels: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const agents = instances.map((inst, i) => {
      // Generate a consistent anonymous name from the instance id
      const hash = inst.id.slice(-4).toUpperCase()
      const name = `AGENT-${hash}`

      const status = inst.status === 'RUNNING' ? 'online' : 'deploying'

      // Get first enabled channel type, or 'Multi' if multiple
      const channels = inst.config?.channels?.filter(c => c.enabled) ?? []
      const channel = channels.length > 1
        ? 'Multi'
        : channels.length === 1
          ? channels[0].type.charAt(0) + channels[0].type.slice(1).toLowerCase()
          : 'Pending'

      // Calculate uptime from creation date
      const ageMs = Date.now() - inst.createdAt.getTime()
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))
      const uptime = ageDays > 0 ? `${ageDays}d` : '<1d'

      return { name, status, uptime, channel }
    })

    return NextResponse.json({ agents, total: agents.length })
  } catch (error) {
    console.error('Public agents error:', error)
    return NextResponse.json({ agents: [], total: 0 })
  }
}
