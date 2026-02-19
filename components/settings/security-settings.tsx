'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectOption } from '@/components/ui/select'
import { ConfigSaveBar } from './config-save-bar'
import { Shield, Users, Lock } from 'lucide-react'

interface SecuritySettingsProps {
  config: any
  onConfigChange: () => void
}

export function SecuritySettings({ config, onConfigChange }: SecuritySettingsProps) {
  const [dmPolicy, setDmPolicy] = useState(config?.dmPolicy || 'pairing')
  const [sessionMode, setSessionMode] = useState(config?.sessionMode || 'per-sender')
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    const changed =
      dmPolicy !== (config.dmPolicy || 'pairing') ||
      sessionMode !== (config.sessionMode || 'per-sender')
    setHasChanges(changed)
  }, [dmPolicy, sessionMode, config])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = {}
      if (dmPolicy !== config?.dmPolicy) body.dmPolicy = dmPolicy
      if (sessionMode !== config?.sessionMode) body.sessionMode = sessionMode

      const res = await fetch('/api/instance/config/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error((await res.json()).error)
      setHasChanges(false)
      onConfigChange()
    } catch (err: any) {
      alert(err.message || 'Failed to update security settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setDmPolicy(config?.dmPolicy || 'pairing')
    setSessionMode(config?.sessionMode || 'per-sender')
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* DM Policy */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">access-control</span>
        </div>
        <CardContent className="pt-5 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-3.5 w-3.5 text-red-400/60" />
              <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">DM Policy</label>
            </div>
            <Select value={dmPolicy} onValueChange={v => setDmPolicy(v)}>
              <SelectOption value="pairing">Pairing (Requires approval code)</SelectOption>
              <SelectOption value="open">Open (Anyone can message)</SelectOption>
              <SelectOption value="closed">Closed (Only allowlisted users)</SelectOption>
            </Select>
            <p className="text-[10px] text-white/15 font-mono">
              {dmPolicy === 'pairing' && 'Users must enter a pairing code before they can chat with your bot'}
              {dmPolicy === 'open' && 'Anyone can start chatting with your bot immediately'}
              {dmPolicy === 'closed' && 'Only users in the allowlist can chat with your bot'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-3.5 w-3.5 text-red-400/60" />
              <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Session Mode</label>
            </div>
            <Select value={sessionMode} onValueChange={v => setSessionMode(v)}>
              <SelectOption value="per-sender">Per Sender (Each user gets own session)</SelectOption>
              <SelectOption value="shared">Shared (All users share one session)</SelectOption>
              <SelectOption value="group-isolated">Group Isolated (Each group gets own session)</SelectOption>
            </Select>
            <p className="text-[10px] text-white/15 font-mono">
              {sessionMode === 'per-sender' && 'Each user has their own conversation history and context'}
              {sessionMode === 'shared' && 'All users share the same conversation context'}
              {sessionMode === 'group-isolated' && 'Each group chat has its own conversation context'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <div className="rounded-xl border border-red-500/10 bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <Lock className="h-4 w-4 text-red-500/40 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs text-white/40 font-mono">Per-channel allowlists</p>
            <p className="text-[10px] text-white/20">
              To manage allowlists per channel (e.g., whitelist specific Telegram users), go to the Channels tab and expand the channel you want to configure.
            </p>
          </div>
        </div>
      </div>

      <ConfigSaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
