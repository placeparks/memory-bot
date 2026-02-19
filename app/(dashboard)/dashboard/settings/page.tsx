'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bot, MessageSquare, Zap, Shield, Settings } from 'lucide-react'
import { AgentSettings } from '@/components/settings/agent-settings'
import { ChannelSettings } from '@/components/settings/channel-settings'
import { SkillsSettings } from '@/components/settings/skills-settings'
import { SecuritySettings } from '@/components/settings/security-settings'
import { AdvancedSettings } from '@/components/settings/advanced-settings'

export default function SettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<any>(null)
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('agent')

  const fetchConfig = useCallback(async () => {
    try {
      // Fetch config
      const configRes = await fetch('/api/instance/config')
      if (configRes.ok) {
        const data = await configRes.json()
        setConfig(data.config)
      }

      // Fetch instance info
      const statusRes = await fetch('/api/instance/status')
      if (statusRes.ok) {
        const data = await statusRes.json()
        setInstance(data.instance)
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleConfigChange = () => {
    // Refresh config after any change
    fetchConfig()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
          <p className="text-xs font-mono text-white/30">Loading configuration...</p>
        </motion.div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/40 font-mono text-sm">No configuration found</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-red-500/20 text-red-400"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <motion.header
        className="border-b border-red-500/10 bg-[#050505]/80 backdrop-blur-sm sticky top-0 z-40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="h-8 px-2 sm:px-3 border-red-500/20 text-white/40 hover:text-white/60 hover:border-red-500/30 shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center shrink-0">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Bot Settings</h1>
                  <p className="hidden sm:block text-[10px] font-mono text-white/25">
                    Configure your agent, channels, and security
                  </p>
                </div>
              </div>
            </div>

            {instance && (
              <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                instance.status === 'RUNNING'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-white/5 border border-white/10 text-white/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  instance.status === 'RUNNING' ? 'bg-red-500 animate-pulse' : 'bg-white/20'
                }`} />
                {instance.status}
              </span>
            )}
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <main className="container mx-auto px-4 pt-8 pb-28 sm:px-6 sm:pb-8 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-2 overflow-x-auto flex-nowrap scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <TabsTrigger value="agent">
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3 w-3" /> Agent
                </span>
              </TabsTrigger>
              <TabsTrigger value="channels">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Channels
                </span>
              </TabsTrigger>
              <TabsTrigger value="skills">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Skills
                </span>
              </TabsTrigger>
              <TabsTrigger value="security">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Security
                </span>
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <span className="flex items-center gap-1.5">
                  <Settings className="h-3 w-3" /> Advanced
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agent">
              <AgentSettings config={config} onConfigChange={handleConfigChange} />
            </TabsContent>

            <TabsContent value="channels">
              <ChannelSettings config={config} onConfigChange={handleConfigChange} />
            </TabsContent>

            <TabsContent value="skills">
              <SkillsSettings config={config} onConfigChange={handleConfigChange} />
            </TabsContent>

            <TabsContent value="security">
              <SecuritySettings config={config} onConfigChange={handleConfigChange} />
            </TabsContent>

            <TabsContent value="advanced">
              <AdvancedSettings config={config} instance={instance} onConfigChange={handleConfigChange} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  )
}
