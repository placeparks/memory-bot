import { prisma } from '@/lib/prisma'

const BASE_PORT = parseInt(process.env.BASE_PORT || '18790')
const MAX_INSTANCES = parseInt(process.env.MAX_INSTANCES || '100')

export async function allocatePort(): Promise<number> {
  const usedPorts = await prisma.instance.findMany({
    select: { port: true }
  })

  const usedPortNumbers = new Set(usedPorts.map(i => i.port))

  for (let i = 0; i < MAX_INSTANCES; i++) {
    const port = BASE_PORT + i
    if (!usedPortNumbers.has(port)) {
      return port
    }
  }

  throw new Error('No available ports. Maximum instance limit reached.')
}
