'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RotateCw, Download, AlertTriangle, Loader2, Trash2 } from 'lucide-react'

interface AdvancedSettingsProps {
  config: any
  instance: any
  onConfigChange: () => void
}

export function AdvancedSettings({ config, instance, onConfigChange }: AdvancedSettingsProps) {
  const [restarting, setRestarting] = useState(false)
  const [destroying, setDestroying] = useState(false)
  const [showDestroy, setShowDestroy] = useState(false)

  const handleForceRestart = async () => {
    setRestarting(true)
    try {
      const res = await fetch('/api/instance/restart', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      onConfigChange()
    } catch (err: any) {
      alert(err.message || 'Failed to restart')
    } finally {
      setRestarting(false)
    }
  }

  const handleExportConfig = () => {
    if (!config) return
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'openclaw-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Config Viewer */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">config-json</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportConfig}
            className="h-6 px-2 border-red-500/20 text-red-400/60 hover:text-red-400 text-[10px] font-mono"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
        <CardContent className="p-0">
          <pre className="p-4 text-[11px] font-mono text-white/40 overflow-x-auto max-h-[300px] overflow-y-auto">
            {config ? JSON.stringify(config, null, 2) : 'Loading...'}
          </pre>
        </CardContent>
      </Card>

      {/* Instance Info */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">instance-info</span>
        </div>
        <CardContent className="pt-4 space-y-3">
          {[
            { label: 'Instance ID', value: instance?.id },
            { label: 'Container', value: instance?.containerName || instance?.containerId },
            { label: 'Status', value: instance?.status },
            { label: 'Backend', value: instance?.deployBackend || 'railway' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-white/30 font-mono text-xs">{item.label}</span>
              <code className="text-xs font-mono text-white/50 bg-white/[0.03] px-2 py-0.5 rounded">
                {item.value || '—'}
              </code>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">actions</span>
        </div>
        <CardContent className="pt-4 space-y-3">
          <Button
            variant="outline"
            onClick={handleForceRestart}
            disabled={restarting}
            className="w-full justify-start border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5"
          >
            {restarting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4 mr-2" />
            )}
            Force Restart Instance
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border border-red-900/30 bg-red-950/10 text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-900/20 bg-red-950/20">
          <AlertTriangle className="w-3 h-3 text-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/50 uppercase tracking-wider">danger-zone</span>
        </div>
        <CardContent className="pt-4">
          {!showDestroy ? (
            <Button
              variant="outline"
              onClick={() => setShowDestroy(true)}
              className="w-full justify-start border-red-900/30 text-red-500/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/5"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Destroy Instance
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-red-400/60">
                This will permanently delete your bot instance and all associated data. This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDestroy(false)}
                  className="border-white/10 text-white/40"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={destroying}
                  className="bg-red-600 hover:bg-red-500 text-white border-0"
                  onClick={async () => {
                    setDestroying(true)
                    // TODO: implement destroy endpoint
                    alert('Destroy functionality coming soon')
                    setDestroying(false)
                    setShowDestroy(false)
                  }}
                >
                  {destroying ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                  Yes, Destroy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
