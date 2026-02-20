/**
 * Smoke-test for the pdf-parse / pdfjs-dist worker fix.
 * Run: node scripts/test-pdf-parse.mjs
 *
 * Mirrors the logic in:
 *   app/api/memory/[instanceId]/documents/route.ts → parsePdf()
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve, dirname } from 'node:path'

// ── Minimal valid PDF (no content stream, just structure) ──────────────────
// Built so the xref offsets are exact. pdfjs-dist accepts pages with no
// content stream and will return an empty text string — that counts as success.
function buildMinimalPdf() {
  const lines = []
  const offsets = []

  const add = (s) => {
    offsets.push(lines.reduce((n, l) => n + l.length + 1, 0))
    lines.push(s)
  }

  lines.push('%PDF-1.4')                      // header (not tracked in xref)

  add('1 0 obj')
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add('endobj')

  add('2 0 obj')
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  add('endobj')

  add('3 0 obj')
  add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>')
  add('endobj')

  const xrefPos = lines.join('\n').length + 1

  lines.push('xref')
  lines.push('0 4')
  // object 0 is always free
  lines.push('0000000000 65535 f ')
  // objects 1-3 — we compute byte offsets from the full string
  const full = '%PDF-1.4\n' + lines.slice(0, 3 * 3).join('\n') + '\n'

  // Re-build properly with real byte offsets
  const header = '%PDF-1.4\n'
  const obj1   = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  const obj2   = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
  const obj3   = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n'

  const off1 = header.length
  const off2 = off1 + obj1.length
  const off3 = off2 + obj2.length
  const xref = off3 + obj3.length

  const xrefTable =
    'xref\n' +
    '0 4\n' +
    '0000000000 65535 f \n' +
    String(off1).padStart(10, '0') + ' 00000 n \n' +
    String(off2).padStart(10, '0') + ' 00000 n \n' +
    String(off3).padStart(10, '0') + ' 00000 n \n'

  const trailer =
    'trailer\n' +
    '<< /Size 4 /Root 1 0 R >>\n' +
    'startxref\n' +
    xref + '\n' +
    '%%EOF\n'

  return Buffer.from(header + obj1 + obj2 + obj3 + xrefTable + trailer)
}

async function main() {
  console.log('\n=== pdf-parse worker smoke-test ===\n')

  const req = createRequire(import.meta.url)
  const { PDFParse } = req('pdf-parse')

  // ── 1. Resolve worker path (same as API route) ──────────────────────────
  const pdfParseMain = req.resolve('pdf-parse')
  const workerPath   = resolve(dirname(pdfParseMain), 'pdf.worker.mjs')
  const workerUrl    = pathToFileURL(workerPath).href

  console.log('  pdf-parse CJS :', pdfParseMain)
  console.log('  worker path   :', workerPath)
  console.log('  worker URL    :', workerUrl)

  PDFParse.setWorker(workerUrl)
  console.log('  ✓ PDFParse.setWorker() set\n')

  // ── 2. Try to parse a real PDF from the network first ───────────────────
  let buffer
  let source
  try {
    const res = await fetch(
      'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf',
      { signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      buffer = Buffer.from(await res.arrayBuffer())
      source = `w3.org sample (${(buffer.length / 1024).toFixed(1)} KB)`
    }
  } catch { /* offline */ }

  if (!buffer) {
    buffer = buildMinimalPdf()
    source = 'built-in minimal PDF'
  }
  console.log(`  PDF source: ${source}`)

  // ── 3. Parse ─────────────────────────────────────────────────────────────
  console.log('  Parsing...')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const chars = result.text.length
    const preview = result.text.slice(0, 100).replace(/\s+/g, ' ').trim()
    console.log(`\n  ✓ parsed successfully — ${chars} chars extracted`)
    if (preview) console.log(`  Preview: "${preview}${chars > 100 ? '…' : ''}"`)
    console.log('\n=== PASS ===\n')
  } finally {
    await parser.destroy().catch(() => {}) // suppress Windows UV_HANDLE_CLOSING noise
  }
}

main().catch(err => {
  console.error('\n=== FAIL ===')
  console.error(err.message)
  process.exit(1)
})
