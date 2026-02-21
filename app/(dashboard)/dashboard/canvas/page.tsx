'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Layout, RefreshCw, ExternalLink, Settings, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_CANVAS_PATH = '__openclaw__/canvas/'

export default function CanvasPage() {
  const router = useRouter()
  const [canvasEnabled, setCanvasEnabled] = useState<boolean | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [urlInput, setUrlInput] = useState(DEFAULT_CANVAS_PATH)
  const [iframeSrc, setIframeSrc] = useState(`/api/instance/canvas/${DEFAULT_CANVAS_PATH}`)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    fetch('/api/instance/canvas')
      .then((r) => r.json())
      .then((d) => {
        setCanvasEnabled(d.canvasEnabled ?? false)
        setIsRunning(d.isRunning ?? false)
      })
      .catch(() => setCanvasEnabled(false))
      .finally(() => setLoading(false))
  }, [])

  function handleReload() {
    setReloadKey((k) => k + 1)
  }

  function handleNavigate(e: React.FormEvent) {
    e.preventDefault()
    const clean = urlInput.replace(/^\/+/, '')
    setIframeSrc(`/api/instance/canvas/${clean}`)
    setReloadKey((k) => k + 1)
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
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/40 hover:text-white/70 transition-colors text-sm font-mono"
            >
              ← dashboard
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5 text-red-400" />
              <h1 className="text-lg font-semibold">Canvas Viewer</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
              isRunning
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : 'bg-white/5 border border-white/10 text-white/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
              {isRunning ? 'Running' : 'Not running'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        {/* Canvas disabled state */}
        {canvasEnabled === false && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/10 rounded-xl p-12 text-center space-y-4"
          >
            <Layout className="w-10 h-10 text-white/20 mx-auto" />
            <h2 className="text-lg font-semibold text-white/60">Canvas skill is not enabled</h2>
            <p className="text-sm text-white/30 font-mono max-w-sm mx-auto">
              Enable the Canvas skill in Settings to view your bot&apos;s live canvas output here.
            </p>
            <Button
              variant="outline"
              className="border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all font-mono text-xs"
              onClick={() => router.push('/dashboard/settings')}
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Open Settings → Skills
            </Button>
          </motion.div>
        )}

        {/* Canvas enabled state */}
        {canvasEnabled === true && (
          <>
            {/* Nav bar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <form onSubmit={handleNavigate} className="flex items-center gap-2 flex-1">
                <div className="flex-1 flex items-center bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 focus-within:border-red-500/30 transition-colors">
                  <span className="text-white/20 text-xs font-mono mr-2 shrink-0">/api/instance/canvas/</span>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="bg-transparent text-sm font-mono text-white/70 outline-none flex-1 min-w-0"
                    placeholder={DEFAULT_CANVAS_PATH}
                  />
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="border-white/10 text-white/50 hover:text-white text-xs shrink-0"
                >
                  Go
                </Button>
              </form>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReload}
                className="border-white/10 text-white/50 hover:text-white text-xs shrink-0"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(iframeSrc, '_blank')}
                className="border-white/10 text-white/50 hover:text-white text-xs shrink-0"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Open
              </Button>
            </motion.div>

            {/* Canvas server not running */}
            {!isRunning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-yellow-500/[0.04] border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4 text-yellow-400/60 shrink-0" />
                <p className="text-xs text-yellow-400/60 font-mono">
                  Canvas server is not responding yet. The container may still be starting up.
                </p>
              </motion.div>
            )}

            {/* iframe */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden"
            >
              <iframe
                key={reloadKey}
                src={iframeSrc}
                className="w-full"
                style={{ height: 600, display: 'block', border: 'none' }}
                title="Canvas Viewer"
              />
            </motion.div>

            {/* Info panel */}
            <p className="text-[11px] text-white/25 font-mono text-center">
              The canvas shows what your bot is currently presenting. The bot updates this automatically using canvas commands.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
