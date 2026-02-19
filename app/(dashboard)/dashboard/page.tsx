'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Play, Square, RotateCw, Activity, Bot, MessageSquare,
  ExternalLink, Shield, Flame, Terminal, Cpu, Zap,
  ArrowRight, Hash, Crown, Clock, Server, Settings
} from 'lucide-react'
import InstanceStatus from '@/components/dashboard/instance-status'
import ChannelAccess from '@/components/dashboard/channel-access'
import UsageStats from '@/components/dashboard/usage-stats'

// Floating particles
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-red-500/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.1, 0.35, 0.1],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 5 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// Animated uptime counter
function UptimeCounter() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-mono text-red-500/60 text-xs tabular-nums">{time}</span>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/instance/status')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true)
    try {
      await fetch(`/api/instance/${action}`, { method: 'POST' })
      await fetchStatus()
    } catch (error) {
      console.error(`${action} failed:`, error)
      alert(`Failed to ${action} instance. Please try again.`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Could not open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open billing portal')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#050505] text-white scanlines noise"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        <Particles />
        <motion.div
          className="text-center relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="relative mx-auto mb-6 w-20 h-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500" />
          </motion.div>
          <p className="text-white/40 font-mono text-sm">Initializing command center...</p>
        </motion.div>
      </div>
    )
  }

  // No instance state
  if (!data?.hasInstance) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[#050505] text-white scanlines noise"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        <Particles />
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-red-500/[0.05] blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <Card className="max-w-md border border-red-500/20 bg-white/[0.02] text-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-900/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-900/30" />
              <span className="ml-2 text-[10px] font-mono text-red-500/50 uppercase tracking-wider">no-instance</span>
            </div>
            <CardHeader>
              <CardTitle className="text-white">No Instance Found</CardTitle>
              <CardDescription className="text-white/60 font-mono text-xs">
                You haven{"'"}t deployed your AI agent yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => router.push('/onboard')}
                  className="w-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_25px_rgba(220,38,38,0.25)] hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all duration-300"
                >
                  <Bot className="mr-2 h-4 w-4" />
                  Deploy Your Agent
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  const { instance, subscription } = data
  const isOnline = instance.isHealthy

  return (
    <div
      className="min-h-screen bg-[#050505] text-white scanlines noise"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <Particles />

      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-32 -right-20 h-80 w-80 rounded-full bg-red-600/8 blur-[100px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-red-500/5 blur-[120px]"
          animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ═══════════════════════════════════════
          COMMAND CENTER HEADER
          ═══════════════════════════════════════ */}
      <motion.header
        className="relative border-b border-red-500/10 bg-[#050505]/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {/* Agent avatar with status ring */}
              <div className="relative">
                <motion.div
                  className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${
                    isOnline
                      ? 'border-red-500/40 bg-red-500/10 shadow-[0_0_25px_rgba(220,38,38,0.2)]'
                      : 'border-white/10 bg-white/5'
                  }`}
                  animate={isOnline ? {
                    boxShadow: ['0 0 20px rgba(220,38,38,0.15)', '0 0 35px rgba(220,38,38,0.3)', '0 0 20px rgba(220,38,38,0.15)'],
                  } : {}}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Bot className="h-6 w-6 text-red-500" />
                </motion.div>
                {/* Live status dot */}
                <motion.div
                  className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#050505] ${
                    isOnline ? 'bg-red-500' : 'bg-white/20'
                  }`}
                  animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight">
                    Command Center
                  </h1>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                    isOnline
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-white/5 border border-white/10 text-white/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-white/30 font-mono">
                    {subscription?.plan.replace('_', ' ')} Plan
                  </span>
                  <span className="text-white/10">|</span>
                  <UptimeCounter />
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {[
                {
                  label: 'Start', icon: Play,
                  action: () => handleAction('start'),
                  disabled: instance.status === 'RUNNING' || actionLoading,
                },
                {
                  label: 'Stop', icon: Square,
                  action: () => handleAction('stop'),
                  disabled: instance.status === 'STOPPED' || actionLoading,
                },
                {
                  label: 'Restart', icon: RotateCw,
                  action: () => handleAction('restart'),
                  disabled: actionLoading,
                },
                {
                  label: 'Settings', icon: Settings,
                  action: () => router.push('/dashboard/settings'),
                  disabled: false,
                },
              ].map((btn) => (
                <motion.div key={btn.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1 sm:flex-initial">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-red-500/20 text-red-500/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5 disabled:opacity-30 disabled:text-red-500/30 transition-all duration-300"
                    onClick={btn.action}
                    disabled={btn.disabled}
                  >
                    <btn.icon className="h-3.5 w-3.5 mr-1.5" />
                    {btn.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════ */}
      <main className="container mx-auto px-4 py-8 sm:px-6 sm:py-10 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <InstanceStatus
                instance={instance}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ChannelAccess channels={instance.channels} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <UsageStats instance={instance} />
            </motion.div>
          </div>

          {/* ═══════════════════════════════════
              SIDEBAR
              ═══════════════════════════════════ */}
          <div className="space-y-6">
            {/* Subscription Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <span className="text-[10px] font-mono text-red-500/50 uppercase tracking-wider">subscription</span>
                </div>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 font-mono text-xs">Plan</span>
                    <span className="font-semibold text-sm">{subscription?.plan.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 font-mono text-xs">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                      subscription?.status === 'ACTIVE'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-white/5 border border-white/10 text-white/40'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${subscription?.status === 'ACTIVE' ? 'bg-red-500' : 'bg-white/20'}`} />
                      {subscription?.status}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      className="w-full border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-300 font-mono text-xs"
                    >
                      Manage Subscription
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Agent Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <span className="text-[10px] font-mono text-red-500/50 uppercase tracking-wider">agent-info</span>
                </div>
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Container ID</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono text-white/50 bg-white/[0.03] px-2 py-1 rounded border border-red-500/10 flex-1 truncate">
                          {instance.id}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-7 px-2 border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all"
                          onClick={() => {
                            navigator.clipboard.writeText(instance.id)
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 font-mono text-xs">Port</span>
                      <span className="font-mono text-sm text-white/60">{instance.port}</span>
                    </div>
               
                  </div>
                  <div className="pt-3 mt-3 border-t border-red-500/10">
                    <Button
                      variant="outline"
                      className="w-full border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 transition-all duration-300 font-mono text-xs"
                      onClick={() => router.push('/dashboard/settings')}
                    >
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Configure Bot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Help & Support */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
                  <div className="w-2 h-2 rounded-full bg-red-500/60" />
                  <span className="text-[10px] font-mono text-red-500/50 uppercase tracking-wider">support</span>
                </div>
                <CardContent className="pt-5 space-y-3">
                  <a
                    href="https://discord.gg/clawclub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-500/10 bg-white/[0.02] hover:border-red-500/25 hover:bg-red-500/[0.03] transition-all duration-300 group"
                  >
                    <Hash className="h-4 w-4 text-red-500/50 group-hover:text-red-400 transition-colors" />
                    <div>
                      <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors">Discord Community</p>
                      <p className="text-[10px] text-white/40 font-mono">Get help from members</p>
                    </div>
                  </a>
                  <a
                    href="mailto:support@clawclub.io"
                    className="flex items-center gap-3 p-3 rounded-lg border border-red-500/10 bg-white/[0.02] hover:border-red-500/25 hover:bg-red-500/[0.03] transition-all duration-300 group"
                  >
                    <MessageSquare className="h-4 w-4 text-red-500/50 group-hover:text-red-400 transition-colors" />
                    <div>
                      <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors">Contact Support</p>
                      <p className="text-[10px] text-white/40 font-mono">Direct email support</p>
                    </div>
                  </a>
                </CardContent>
              </Card>
            </motion.div>

            {/* Security note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-xl border border-red-500/10 bg-white/[0.02] p-4 text-xs text-white/25 font-mono"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500/40" />
                Isolated container. Encrypted keys. Zero access.
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
