import { NextRequest, NextResponse } from 'next/server'
import { mineAllInstances } from '@/lib/memory'

export const maxDuration = 300 // 5 min timeout for Vercel

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await mineAllInstances()
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[Cron] Log mining error:', err)
    return NextResponse.json({ error: 'Mining failed' }, { status: 500 })
  }
}
