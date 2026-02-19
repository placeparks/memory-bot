'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Search, User, Building2, Tag, Package, MapPin, HelpCircle, TrendingUp, Clock } from 'lucide-react'

interface Entity {
  id: string
  type: string
  name: string
  aliases: string[]
  summary?: string
  importance: number
  interactionCount: number
  lastSeen?: string
  createdAt: string
}

const TYPE_ICONS: Record<string, any> = {
  PERSON: User,
  ORGANIZATION: Building2,
  TOPIC: Tag,
  PRODUCT: Package,
  LOCATION: MapPin,
  OTHER: HelpCircle,
}

const TYPE_COLORS: Record<string, string> = {
  PERSON: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  ORGANIZATION: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  TOPIC: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  PRODUCT: 'text-green-400 bg-green-500/10 border-green-500/20',
  LOCATION: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  OTHER: 'text-white/40 bg-white/5 border-white/10',
}

function EntityCard({ entity }: { entity: Entity }) {
  const Icon = TYPE_ICONS[entity.type] ?? HelpCircle
  const colorClass = TYPE_COLORS[entity.type] ?? TYPE_COLORS.OTHER

  const lastSeen = entity.lastSeen
    ? (() => {
        const d = Math.floor((Date.now() - new Date(entity.lastSeen).getTime()) / 86400000)
        return d === 0 ? 'today' : `${d}d ago`
      })()
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/[0.02] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg border ${colorClass} flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">{entity.name}</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono ${colorClass}`}>
              {entity.type}
            </span>
          </div>
          {entity.aliases.length > 0 && (
            <p className="text-xs text-white/30 mt-0.5">
              Also known as: {entity.aliases.slice(0, 3).join(', ')}
            </p>
          )}
        </div>
      </div>

      {entity.summary && (
        <p className="text-xs text-white/50 leading-relaxed mb-3 line-clamp-3">{entity.summary}</p>
      )}

      <div className="flex items-center gap-4 text-xs font-mono text-white/25">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>{entity.interactionCount} interactions</span>
        </div>
        {lastSeen && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{lastSeen}</span>
          </div>
        )}
        <div className="ml-auto">
          <div className="flex items-center gap-1">
            <span>importance:</span>
            <span className="text-white/40">{Math.round(entity.importance * 100)}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function EntitiesPage() {
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  useEffect(() => {
    async function load() {
      const statusRes = await fetch('/api/instance/status')
      if (!statusRes.ok) { setLoading(false); return }
      const { instance } = await statusRes.json()
      if (!instance?.id) { setLoading(false); return }

      const res = await fetch(`/api/memory/${instance.id}/entities?limit=200`)
      if (res.ok) {
        const data = await res.json()
        setEntities(data.entities ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const types = ['ALL', ...Array.from(new Set(entities.map(e => e.type)))]

  const filtered = entities.filter(e => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) ||
      e.aliases.some(a => a.toLowerCase().includes(q)) ||
      e.summary?.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="border-b border-white/5 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/memory')} className="text-white/40 hover:text-white/70 text-sm font-mono">
              ← memory
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h1 className="text-lg font-semibold">Entity Knowledge Graph</h1>
            </div>
          </div>
          <span className="text-sm font-mono text-white/30">{entities.length} entities</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-4">

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entities..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-white/25"
            />
          </div>
          <div className="flex gap-2">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                  typeFilter === t
                    ? 'bg-white/10 border-white/20 text-white/80'
                    : 'bg-white/5 border-white/10 text-white/30 hover:text-white/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Users className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-white/30 text-sm">
              {search ? 'No entities match your search' : 'No entities discovered yet'}
            </p>
            <p className="text-white/20 text-xs">
              Entities are automatically extracted from your agent's conversations
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(e => <EntityCard key={e.id} entity={e} />)}
          </div>
        )}
      </div>
    </div>
  )
}
