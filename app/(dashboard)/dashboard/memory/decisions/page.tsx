'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GitBranch, Search, ChevronDown, ChevronUp, Calendar, Check, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Decision {
  id: string
  context: string
  decision: string
  reasoning: string[]
  alternativesConsidered: string[]
  tags: string[]
  senderId?: string
  outcome?: string
  outcomeAt?: string
  createdAt: string
}

function DecisionCard({ d, instanceId }: { d: Decision; instanceId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [outcome, setOutcome] = useState(d.outcome ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!d.outcome)

  async function saveOutcome() {
    if (!outcome.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/memory/${instanceId}/decisions/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      })
      setSaved(true)
    } catch { /* ignore */ }
    setSaving(false)
  }

  const date = new Date(d.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden"
    >
      <div
        className="p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Date + tags */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              <span className="text-xs font-mono text-white/30">{date}</span>
              {d.tags.map(t => (
                <span key={t} className="text-xs font-mono px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  #{t}
                </span>
              ))}
            </div>
            {/* Context */}
            <p className="text-xs text-white/40 italic mb-1 leading-relaxed line-clamp-1">{d.context}</p>
            {/* Decision */}
            <p className="text-sm text-white/90 font-medium leading-relaxed">{d.decision}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {saved && <Check className="w-4 h-4 text-green-400" />}
            {expanded
              ? <ChevronUp className="w-4 h-4 text-white/30" />
              : <ChevronDown className="w-4 h-4 text-white/30" />}
          </div>
        </div>

        {/* Outcome pill */}
        {d.outcome && (
          <div className="mt-3 flex items-center gap-2">
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-xs text-green-400/70 italic">{d.outcome}</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-5 pb-5 space-y-5">

          {/* Context */}
          <div className="pt-4">
            <p className="text-xs font-mono text-white/40 mb-2">CONTEXT</p>
            <p className="text-sm text-white/60 leading-relaxed">{d.context}</p>
          </div>

          {/* Reasoning chain */}
          {d.reasoning.length > 0 && (
            <div>
              <p className="text-xs font-mono text-white/40 mb-3">REASONING</p>
              <div className="space-y-2">
                {d.reasoning.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-xs font-mono text-white/20 mt-0.5 flex-shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm text-white/60 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives */}
          {d.alternativesConsidered?.length > 0 && (
            <div>
              <p className="text-xs font-mono text-white/40 mb-2">ALTERNATIVES CONSIDERED</p>
              <div className="flex flex-wrap gap-2">
                {d.alternativesConsidered.map((a, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded text-white/50">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Outcome recorder */}
          <div className="pt-2">
            <p className="text-xs font-mono text-white/30 mb-2">RECORD OUTCOME</p>
            <div className="flex gap-2">
              <input
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                placeholder="What actually happened? Did this work out?"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/25"
              />
              <Button
                size="sm"
                onClick={saveOutcome}
                disabled={saving || !outcome.trim()}
                className="bg-white/10 hover:bg-white/15 text-white/70 text-xs flex-shrink-0"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function DecisionsPage() {
  const router = useRouter()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [instanceId, setInstanceId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const statusRes = await fetch('/api/instance/status')
      if (!statusRes.ok) { setLoading(false); return }
      const { instance } = await statusRes.json()
      if (!instance?.id) { setLoading(false); return }
      setInstanceId(instance.id)

      const res = await fetch(`/api/memory/${instance.id}/decisions?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setDecisions(data.decisions ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = decisions.filter(d => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.decision.toLowerCase().includes(q) ||
      d.context.toLowerCase().includes(q) ||
      d.reasoning.some(r => r.toLowerCase().includes(q)) ||
      d.tags.some(t => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard/memory')}
              className="text-white/40 hover:text-white/70 text-sm font-mono"
            >
              ← memory
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-400" />
              <h1 className="text-lg font-semibold">Decision Journal</h1>
            </div>
          </div>
          <span className="text-sm font-mono text-white/30">{decisions.length} decisions</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6 space-y-4">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search decisions, context, reasoning, or tags..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/25"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <GitBranch className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-white/30 text-sm">
              {search ? 'No decisions match your search' : 'No decisions recorded yet'}
            </p>
            <p className="text-white/20 text-xs">
              Decisions are written by your agent during conversations — context, reasoning, and alternatives included
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {instanceId && filtered.map(d => (
              <DecisionCard key={d.id} d={d} instanceId={instanceId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
