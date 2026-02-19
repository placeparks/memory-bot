import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storeDocument, getDocuments, getTotalDocumentsMB } from '@/lib/memory/stores/documents'
import { getOrCreateMemoryConfig } from '@/lib/memory'
import { getTierLimits } from '@/lib/memory/tiers'

async function verifyAccess(instanceId: string, req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const instance = await prisma.instance.findFirst({
      where: { id: instanceId, user: { email: session.user.email } },
    })
    if (instance) return true
  }
  const auth = req.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    const key = auth.slice(7)
    const cfg = await (prisma as any).memoryConfig.findFirst({ where: { instanceId, memoryApiKey: key } })
    if (cfg) return true
  }
  return false
}

export async function GET(req: NextRequest, { params }: { params: { instanceId: string } }) {
  const { instanceId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const documents = await getDocuments(instanceId)
  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest, { params }: { params: { instanceId: string } }) {
  const { instanceId } = params
  if (!(await verifyAccess(instanceId, req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getOrCreateMemoryConfig(instanceId)
  const limits = getTierLimits(config.tier as 'STANDARD' | 'PRO')
  const usedMB = await getTotalDocumentsMB(instanceId)

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const fileSizeMB = file.size / (1024 * 1024)
  if (usedMB + fileSizeMB > limits.maxDocumentsMB) {
    return NextResponse.json(
      { error: `Storage limit reached (${limits.maxDocumentsMB} MB). Upgrade to Pro for more.` },
      { status: 429 }
    )
  }

  let content = ''
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const pdfParse = await new Function('return import("pdf-parse")')().catch(() => null)
      if (pdfParse?.default) {
        const parsed = await pdfParse.default(buffer)
        content = parsed.text
      } else {
        return NextResponse.json(
          { error: 'PDF support requires pdf-parse. Upload .txt or .md files instead.' },
          { status: 422 }
        )
      }
    } catch {
      return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 422 })
    }
  } else {
    // Use file.text() — works reliably across all Node.js versions
    content = await file.text()
  }

  if (!content.trim()) {
    return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 })
  }

  const id = await storeDocument(instanceId, file.name, file.type || 'text/plain', content, file.size)
  return NextResponse.json({ id })
}
