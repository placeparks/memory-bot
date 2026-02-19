import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()

    // Try a simple query
    const userCount = await prisma.user.count()

    return NextResponse.json({
      success: true,
      message: 'Database connected!',
      userCount,
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    })
  } catch (error: any) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 })
  }
}
