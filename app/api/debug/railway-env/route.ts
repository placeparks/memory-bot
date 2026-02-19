import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    hasRailwayToken: Boolean(process.env.RAILWAY_TOKEN),
    railwayProjectId: process.env.RAILWAY_PROJECT_ID || null,
    railwayEnvironmentId: process.env.RAILWAY_ENVIRONMENT_ID || null,
  })
}
