import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storeDocument, getDocuments, getTotalDocumentsMB } from '@/lib/memory/stores/documents'
import { getOrCreateMemoryConfig } from '@/lib/memory'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

export const runtime = 'nodejs'

// pdfjs-dist (used by pdf-parse) references DOMMatrix, a browser API not present in Node.js.
// Polyfill it before the module loads to prevent "DOMMatrix is not defined" errors.
if (typeof globalThis.DOMMatrix === 'undefined') {
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    m11 = 1; m12 = 0; m13 = 0; m14 = 0
    m21 = 0; m22 = 1; m23 = 0; m24 = 0
    m31 = 0; m32 = 0; m33 = 1; m34 = 0
    m41 = 0; m42 = 0; m43 = 0; m44 = 1
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    is2D = true; isIdentity = true
    static fromMatrix() { return new (globalThis as any).DOMMatrix() }
    transformPoint(p: any) { return p }
    multiply() { return this }
    translate() { return this }
    scale() { return this }
    rotate() { return this }
    inverse() { return this }
    toString() { return 'matrix(1,0,0,1,0,0)' }
  }
}

// pdf-parse v2 exports a PDFParse class — use createRequire to bypass webpack bundling.
async function parsePdf(buffer: Buffer): Promise<{ text: string }> {
  const req = createRequire(import.meta.url)
  const { PDFParse } = req('pdf-parse')
  // pdfjs-dist's fake-worker setup does `await import('./pdf.worker.mjs')`.
  // We cannot use req.resolve() here — when webpack bundles this route it
  // shims createRequire and resolve() returns a numeric module ID, not a path.
  // Use process.cwd() (always the Next.js project root, both in dev and in
  // standalone production) to construct an absolute file:// worker URL instead.
  const workerPath = join(
    process.cwd(),
    'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'cjs', 'pdf.worker.mjs'
  )
  PDFParse.setWorker(pathToFileURL(workerPath).href)
  const parser = new PDFParse({ data: buffer })
  try {
    return await parser.getText()
  } finally {
    await parser.destroy()
  }
}

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
  const usedMB = await getTotalDocumentsMB(instanceId)

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

  const fileSizeMB = file.size / (1024 * 1024)
  if (usedMB + fileSizeMB > config.maxDocumentsMB) {
    return NextResponse.json(
      { error: `Storage limit reached (${config.maxDocumentsMB} MB).` },
      { status: 429 }
    )
  }

  let content = ''
  const name = file.name.toLowerCase()

  if (name.endsWith('.pdf')) {
    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const parsed = await parsePdf(buffer)
      content = parsed.text
    } catch (err: any) {
      console.error('PDF parse failed', err)
      return NextResponse.json(
        { error: err?.message ? `Failed to parse PDF: ${err.message}` : 'Failed to parse PDF' },
        { status: 422 }
      )
    }
  } else {
    // Use file.text() — works reliably across all Node.js versions
    content = await file.text()
  }

  if (!content.trim()) {
    return NextResponse.json(
      { error: 'Could not extract text from file. The PDF may be scanned or image-only.' },
      { status: 422 }
    )
  }

  const id = await storeDocument(instanceId, file.name, file.type || 'text/plain', content, file.size)
  return NextResponse.json({ id })
}
