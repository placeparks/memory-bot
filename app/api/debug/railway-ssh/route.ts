import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RailwayClient } from '@/lib/railway/client'
import { exec as execCallback } from 'node:child_process'
import { promisify } from 'node:util'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const exec = promisify(execCallback)

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { instance: true }
  })

  if (!user?.instance) {
    return NextResponse.json(
      { error: 'No instance found' },
      { status: 404 }
    )
  }

  const template = process.env.OPENCLAW_PAIRING_EXEC_COMMAND
  if (!template || !template.includes('{command}')) {
    return NextResponse.json(
      { error: 'Pairing exec command not configured' },
      { status: 501 }
    )
  }

  let containerId = user.instance.containerId
  if (!containerId) {
    if (!user.instance.containerName) {
      return NextResponse.json(
        { error: 'Instance has no container name' },
        { status: 400 }
      )
    }
    const railway = new RailwayClient()
    containerId = await railway.findServiceByName(user.instance.containerName)
    if (!containerId) {
      return NextResponse.json(
        { error: 'Railway service not found for instance' },
        { status: 404 }
      )
    }
  }

  const execCommand = template
    .replaceAll('{serviceId}', containerId)
    .replaceAll('{serviceName}', user.instance.containerName || '')
    .replaceAll('{projectId}', process.env.RAILWAY_PROJECT_ID || '')
    .replaceAll('{environmentId}', process.env.RAILWAY_ENVIRONMENT_ID || '')
    .replaceAll('{command}', 'echo ok')

  try {
    const { stdout, stderr } = await exec(execCommand, {
      timeout: 15_000,
      windowsHide: true,
      maxBuffer: 256 * 1024
    })

    return NextResponse.json({
      ok: true,
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || ''
    })
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Railway SSH failed' },
      { status: 500 }
    )
  }
}
