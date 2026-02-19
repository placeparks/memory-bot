import { prisma } from './lib/prisma'

async function cleanup() {
  try {
    console.log('🧹 Cleaning up instances...')

    // Delete all configurations first
    const configs = await prisma.configuration.deleteMany({})
    console.log(`✅ Deleted ${configs.count} configurations`)

    // Delete all deployment logs
    const logs = await prisma.deploymentLog.deleteMany({})
    console.log(`✅ Deleted ${logs.count} deployment logs`)

    // Delete all instances
    const instances = await prisma.instance.deleteMany({})
    console.log(`✅ Deleted ${instances.count} instances`)

    console.log('✅ Cleanup complete!')

  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanup()
