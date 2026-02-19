'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Database, Upload, Trash2, FileText, Clock, CheckCircle, AlertCircle, Loader, Search, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface KnowledgeDocument {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  status: 'PENDING' | 'INDEXING' | 'READY' | 'ERROR'
  chunkCount: number
  createdAt: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; label: string; cls: string }> = {
    READY: { icon: CheckCircle, label: 'Ready', cls: 'text-green-400 bg-green-500/10 border-green-500/20' },
    INDEXING: { icon: Loader, label: 'Indexing', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    PENDING: { icon: Clock, label: 'Pending', cls: 'text-white/40 bg-white/5 border-white/10' },
    ERROR: { icon: AlertCircle, label: 'Error', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
  }
  const { icon: Icon, label, cls } = map[status] ?? map.PENDING
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className={`w-3 h-3 ${status === 'INDEXING' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  )
}

export default function DocumentsPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<KnowledgeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyStatus, setApplyStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [ragResults, setRagResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const statusRes = await fetch('/api/instance/status')
    if (!statusRes.ok) { setLoading(false); return }
    const { instance } = await statusRes.json()
    if (!instance?.id) { setLoading(false); return }
    setInstanceId(instance.id)

    const res = await fetch(`/api/memory/${instance.id}/documents`)
    if (res.ok) {
      const data = await res.json()
      setDocs(data.documents ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !instanceId) return
    setUploading(true)
    setUploadError(null)

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(`/api/memory/${instanceId}/documents`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error ?? 'Upload failed')
      } else {
        await load()
      }
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!instanceId) return
    if (!confirm('Delete this document? This cannot be undone.')) return
    await fetch(`/api/memory/${instanceId}/documents/${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  async function handleSearch() {
    if (!query.trim() || !instanceId) return
    setSearching(true)
    setRagResults([])
    try {
      const res = await fetch(`/api/memory/${instanceId}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, includeEvents: false, includeEntities: false, includeDecisions: false, includeDocs: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setRagResults(data.results?.documents ?? [])
      }
    } catch { /* ignore */ }
    setSearching(false)
  }

  async function handleApply() {
    setApplying(true)
    setApplyStatus('idle')
    try {
      const res = await fetch('/api/memory/apply', { method: 'POST' })
      setApplyStatus(res.ok ? 'success' : 'error')
    } catch {
      setApplyStatus('error')
    } finally {
      setApplying(false)
      setTimeout(() => setApplyStatus('idle'), 4000)
    }
  }

  const filtered = docs.filter(d => !search || d.filename.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/memory')} className="text-white/40 hover:text-white/70 text-sm font-mono">
              ← memory
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-green-400" />
              <h1 className="text-lg font-semibold">Knowledge Base</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-white/30">{docs.length} documents</span>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.pdf,.csv"
              onChange={handleUpload}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              size="sm"
              className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || docs.length === 0}
              size="sm"
              className={`text-xs border transition-all duration-300 ${
                applyStatus === 'success'
                  ? 'bg-green-500/20 border-green-500/40 text-green-400'
                  : applyStatus === 'error'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30'
              }`}
            >
              <Zap className="w-3 h-3 mr-1" />
              {applying
                ? 'Applying...'
                : applyStatus === 'success'
                ? 'Applied!'
                : applyStatus === 'error'
                ? 'Failed'
                : 'Apply to Agent'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">

        {uploadError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {uploadError}
          </div>
        )}

        {applyStatus === 'success' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">
            Knowledge base applied — your agent now has access to the uploaded documents.
          </div>
        )}
        {applyStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            Failed to apply. Make sure Memory is enabled in Settings → Skills and your agent is running.
          </div>
        )}

        {/* RAG Test Search */}
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-3">
          <p className="text-xs font-mono text-white/40">TEST RAG SEARCH</p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ask a question to test retrieval..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/25"
            />
            <Button
              onClick={handleSearch}
              disabled={searching}
              size="sm"
              className="bg-white/10 hover:bg-white/15 text-white/70 text-xs"
            >
              <Search className="w-3 h-3 mr-1" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {ragResults.length > 0 && (
            <div className="space-y-3 pt-2">
              {ragResults.map((r, i) => (
                <div key={i} className="bg-black/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-green-400">{r.source.filename}</span>
                    <span className="text-xs font-mono text-white/30">
                      chunk #{r.source.chunkIndex} · {Math.round(r.similarity * 100)}% match
                    </span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document List */}
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter documents..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/25"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Database className="w-10 h-10 text-white/10 mx-auto" />
              <p className="text-white/30 text-sm">
                {search ? 'No documents match your filter' : 'No documents uploaded yet'}
              </p>
              <p className="text-white/20 text-xs">
                Upload .txt, .md, .pdf, or .csv files to give your agent a knowledge base
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(doc => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/[0.02] border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-white/20 transition-all"
                >
                  <FileText className="w-5 h-5 text-white/30 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono text-white/30">{formatBytes(doc.sizeBytes)}</span>
                      {doc.chunkCount > 0 && (
                        <span className="text-xs font-mono text-white/25">{doc.chunkCount} chunks indexed</span>
                      )}
                      <span className="text-xs font-mono text-white/25">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Supported formats */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl px-5 py-4">
          <p className="text-xs font-mono text-white/30 mb-2">SUPPORTED FORMATS</p>
          <div className="flex gap-2 flex-wrap">
            {['.txt', '.md', '.pdf', '.csv'].map(fmt => (
              <span key={fmt} className="text-xs font-mono px-2 py-1 bg-white/5 border border-white/10 rounded text-white/40">
                {fmt}
              </span>
            ))}
          </div>
          <p className="text-xs text-white/20 mt-2">
            Documents are chunked, embedded, and indexed for semantic retrieval. Your agent cites sources with provenance.
          </p>
        </div>
      </div>
    </div>
  )
}
