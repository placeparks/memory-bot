'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Brain, Database, Users, GitBranch, FileText, Activity,
  RefreshCw, ArrowRight, Clock, Zap, TrendingUp, Key, Copy, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MemoryStats {
  tier: string
  totalEvents: number
  totalEntities: number
  totalDecisions: number
  totalDocuments: number
  documentsUsedMB: number
  eventsThisMonth: number
  limits: {
    retentionDays: number | null
    maxEntities: number | null
    maxDocumentsMB: number
    maxEventsPerMonth: number
  }
  memoryApiKey: string
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: any
  label: string
  value: string | number
  sub?: string
  color: string
  href?: string
}) {
  const router = useRouter()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white/[0.03] border border-white/10 rounded-xl p-5 cursor-pointer hover:border-white/20 transition-all group ${href ? 'cursor-pointer' : ''}`}
      onClick={() => href && router.push(href)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-white/40 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-white/5`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {href && (
        <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
      )}
    </motion.div>
  )
}

function UsageBar({ used, max, label }: { used: number; max: number | null; label: string }) {
  const pct = max ? Math.min((used / max) * 100, 100) : 0
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-red-400'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono text-white/40">
        <span>{label}</span>
        <span>{max ? `${used.toLocaleString()} / ${max.toLocaleString()}` : `${used.toLocaleString()} / ∞`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: max ? `${pct}%` : '0%' }} />
      </div>
    </div>
  )
}

export default function MemoryDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    try {
      const statusRes = await fetch('/api/instance/status')
      if (!statusRes.ok) return
      const { instance } = await statusRes.json()
      if (!instance?.id) return
      setInstanceId(instance.id)

      const statsRes = await fetch(`/api/memory/${instance.id}/stats`)
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Memory stats load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function copyApiKey() {
    if (!stats?.memoryApiKey) return
    await navigator.clipboard.writeText(stats.memoryApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-white/40 hover:text-white/70 transition-colors text-sm font-mono">
              ← dashboard
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-red-400" />
              <h1 className="text-lg font-semibold">Nexus Memory</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono px-2 py-1 rounded-full border ${stats?.tier === 'PRO' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
              {stats?.tier ?? 'STANDARD'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-white/10 text-white/50 hover:text-white text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="TOTAL MEMORIES"
            value={stats?.totalEvents.toLocaleString() ?? '0'}
            sub={`${stats?.eventsThisMonth ?? 0} this month`}
            color="text-red-400"
          />
          <StatCard
            icon={Users}
            label="KNOWN ENTITIES"
            value={stats?.totalEntities.toLocaleString() ?? '0'}
            sub="people & orgs"
            color="text-blue-400"
            href={`/dashboard/memory/entities`}
          />
          <StatCard
            icon={GitBranch}
            label="DECISIONS LOGGED"
            value={stats?.totalDecisions.toLocaleString() ?? '0'}
            sub="with reasoning"
            color="text-purple-400"
            href={`/dashboard/memory/decisions`}
          />
          <StatCard
            icon={FileText}
            label="KNOWLEDGE DOCS"
            value={stats?.totalDocuments.toLocaleString() ?? '0'}
            sub={`${stats?.documentsUsedMB.toFixed(1) ?? '0'} MB used`}
            color="text-green-400"
            href={`/dashboard/memory/documents`}
          />
        </div>

        {/* Usage Limits */}
        {stats && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/70">Usage &amp; Limits</h2>
              <span className="text-xs font-mono text-white/30">
                Retention: {stats.limits.retentionDays ? `${stats.limits.retentionDays} days` : 'Unlimited'}
              </span>
            </div>
            <UsageBar
              used={stats.eventsThisMonth}
              max={stats.limits.maxEventsPerMonth}
              label="Monthly Events"
            />
            <UsageBar
              used={stats.totalEntities}
              max={stats.limits.maxEntities}
              label="Entity Slots"
            />
            <UsageBar
              used={Math.round(stats.documentsUsedMB)}
              max={stats.limits.maxDocumentsMB}
              label="Document Storage (MB)"
            />
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: GitBranch,
              title: 'Decision Audit Trail',
              desc: 'Every decision your agent made, with full reasoning chain. Search back years.',
              color: 'text-purple-400',
              href: '/dashboard/memory/decisions',
            },
            {
              icon: Users,
              title: 'Entity Knowledge Graph',
              desc: 'People, organizations, and topics your agent knows. Relationships mapped.',
              color: 'text-blue-400',
              href: '/dashboard/memory/entities',
            },
            {
              icon: Database,
              title: 'Knowledge Base (RAG)',
              desc: 'Upload documents your agent can search and cite with provenance.',
              color: 'text-green-400',
              href: '/dashboard/memory/documents',
            },
          ].map((card) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-white/10 rounded-xl p-5 hover:border-white/20 cursor-pointer transition-all group"
              onClick={() => router.push(card.href)}
            >
              <div className="flex items-center gap-3 mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <h3 className="font-medium text-sm">{card.title}</h3>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{card.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                <span>Open</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* API Key */}
        {stats?.memoryApiKey && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-white/40" />
                <h3 className="text-sm font-medium text-white/70">Memory API Key</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyApiKey}
                className="border-white/10 text-white/50 hover:text-white text-xs"
              >
                {copied ? <Check className="w-3 h-3 mr-1 text-green-400" /> : <Copy className="w-3 h-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="font-mono text-xs text-white/30 bg-black/30 rounded px-3 py-2 break-all">
              {stats.memoryApiKey.slice(0, 8)}{'•'.repeat(48)}{stats.memoryApiKey.slice(-8)}
            </p>
            <p className="text-xs text-white/25 mt-2">Use this key to POST memories via the REST API from your agent or integrations.</p>
          </div>
        )}
      </div>
    </div>
  )
}
