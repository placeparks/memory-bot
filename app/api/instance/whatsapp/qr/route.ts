import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RailwayClient } from '@/lib/railway/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const serviceName = user.instance.containerName
    const serviceUrl = user.instance.serviceUrl
    const serviceId = user.instance.containerId
    const accessUrl = user.instance.accessUrl

    let host = ''
    let resolvedName: string | null = null
    if (serviceId) {
      try {
        const railway = new RailwayClient()
        resolvedName = await railway.getServiceName(serviceId)
        if (resolvedName) host = `${resolvedName}.railway.internal`
      } catch {
        host = ''
      }
    }

    if (!host && serviceName) {
      host = `${serviceName}.railway.internal`
    } else if (!host && serviceUrl) {
      try {
        const parsed = new URL(serviceUrl)
        host = parsed.hostname
      } catch {
        host = ''
      }
    }

    if (!host) {
      return NextResponse.json({ error: 'Instance has no service host' }, { status: 400 })
    }

    let publicUrl: string | null = null
    if (accessUrl) {
      publicUrl = accessUrl
    } else if (serviceUrl && !serviceUrl.includes('railway.internal')) {
      publicUrl = serviceUrl
    } else if (serviceId) {
      try {
        const railway = new RailwayClient()
        const deployment = await railway.getLatestDeployment(serviceId)
        if (deployment?.url) publicUrl = deployment.url
      } catch {
        publicUrl = null
      }
    }

    const normalizeBase = (base: string) =>
      (base.startsWith('http') ? base : `https://${base}`).replace(/\/$/, '')

    const candidates: string[] = []
    if (publicUrl) {
      candidates.push(`${normalizeBase(publicUrl)}/whatsapp/qr`)
    }

    if (serviceUrl) {
      try {
        const parsed = new URL(serviceUrl)
        const port = parsed.port ? Number(parsed.port) : 0
        if (port === 18789) parsed.port = '18800'
        if (!parsed.port) parsed.port = '18800'
        candidates.push(`${parsed.toString().replace(/\/$/, '')}/whatsapp/qr`)
      } catch {
        // ignore malformed serviceUrl
      }
    }

    if (host) {
      candidates.push(`http://${host}:18800/whatsapp/qr`)
    }

    let response: Response | null = null
    const errors: { url: string; message: string }[] = []
    for (const url of candidates) {
      try {
        response = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(25000)
        })
        if (response.ok) break
      } catch (error: any) {
        errors.push({ url, message: error?.message || 'Fetch failed' })
      }
    }

    if (!response) {
      return NextResponse.json(
        {
          error: 'Failed to reach instance',
          attempts: errors,
          debug: {
            serviceId,
            resolvedName,
            serviceName,
            serviceUrl,
            publicUrl,
            accessUrl
          }
        },
        { status: 502 }
      )
    }

    const text = await response.text()
    let result: any
    try {
      result = JSON.parse(text)
    } catch {
      result = { success: false, raw: text }
    }

    if (!response.ok || !result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to generate WhatsApp QR', raw: result?.raw || text },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      qr: result?.qr || null,
      raw: result?.raw || ''
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate WhatsApp QR' },
      { status: 500 }
    )
  }
}
