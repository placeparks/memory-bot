'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Brain, Database, GitBranch, FileText,
  RefreshCw, ArrowRight, Key, Copy, Check, User, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MemoryStats {
  profiles: number
  decisions: number
  episodes: number
  documents: number
  documentsUsedMB: number
  maxDocumentsMB: number
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
      className={`relative bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all group ${href ? 'cursor-pointer' : ''}`}
      onClick={() => href && router.push(href)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono text-white/40 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-white/5">
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      {href && (
        <ArrowRight className="absolute bottom-4 right-4 w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
      )}
    </motion.div>
  )
}

export default function MemoryDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    try {
      const statusRes = await fetch('/api/instance/status')
      if (!statusRes.ok) return
      const { instance } = await statusRes.json()
      if (!instance?.id) return

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

  const docPct = stats ? Math.min((stats.documentsUsedMB / stats.maxDocumentsMB) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/40 hover:text-white/70 transition-colors text-sm font-mono"
            >
              ← dashboard
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-red-400" />
              <h1 className="text-lg font-semibold">Nexus Memory</h1>
            </div>
          </div>
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

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={User}
            label="PROFILES"
            value={stats?.profiles.toLocaleString() ?? '0'}
            sub="identity layers"
            color="text-orange-400"
          />
          <StatCard
            icon={GitBranch}
            label="DECISIONS"
            value={stats?.decisions.toLocaleString() ?? '0'}
            sub="with reasoning chains"
            color="text-purple-400"
            href="/dashboard/memory/decisions"
          />
          <StatCard
            icon={Clock}
            label="EPISODES"
            value={stats?.episodes.toLocaleString() ?? '0'}
            sub="conversation snapshots"
            color="text-blue-400"
          />
          <StatCard
            icon={FileText}
            label="KNOWLEDGE DOCS"
            value={stats?.documents.toLocaleString() ?? '0'}
            sub={`${stats?.documentsUsedMB.toFixed(1) ?? '0'} MB used`}
            color="text-green-400"
            href="/dashboard/memory/documents"
          />
        </div>

        {/* Storage bar */}
        {stats && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white/70">Document Storage</h2>
              <span className="text-xs font-mono text-white/30">
                {stats.documentsUsedMB.toFixed(1)} / {stats.maxDocumentsMB} MB
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-all ${docPct > 80 ? 'bg-red-500' : docPct > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${docPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: GitBranch,
              title: 'Decision Journal',
              desc: 'Every decision your agent made with full reasoning chains, alternatives considered, and outcomes recorded.',
              color: 'text-purple-400',
              href: '/dashboard/memory/decisions',
            },
            {
              icon: User,
              title: 'Identity Profiles',
              desc: "Per-user profiles: name, role, communication style, timezone, current focus. Built and updated by your agent.",
              color: 'text-orange-400',
              href: null,
            },
            {
              icon: Database,
              title: 'Knowledge Base (RAG)',
              desc: 'Upload documents your agent can search and cite. Content injected directly into every conversation.',
              color: 'text-green-400',
              href: '/dashboard/memory/documents',
            },
          ].map((card) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white/[0.02] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all group ${card.href ? 'cursor-pointer' : ''}`}
              onClick={() => card.href && router.push(card.href)}
            >
              <div className="flex items-center gap-3 mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <h3 className="font-medium text-sm">{card.title}</h3>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{card.desc}</p>
              {card.href && (
                <div className="mt-4 flex items-center gap-1 text-xs text-white/30 group-hover:text-white/60 transition-colors">
                  <span>Open</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
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
            <p className="text-xs text-white/25 mt-2">
              Use this key (Bearer token) to write profiles, decisions, and episodes via the REST API from your agent.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
