'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectOption } from '@/components/ui/select'
import { AllowlistEditor } from './allowlist-editor'
import { ConfigSaveBar } from './config-save-bar'
import {
  MessageSquare, Hash, Phone, ChevronDown, ChevronUp,
  Plus, Trash2, Loader2
} from 'lucide-react'

const CHANNEL_INFO: Record<string, { name: string; icon: any; fields: { key: string; label: string; type: string; required?: boolean }[] }> = {
  TELEGRAM: {
    name: 'Telegram',
    icon: MessageSquare,
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },
  DISCORD: {
    name: 'Discord',
    icon: Hash,
    fields: [
      { key: 'token', label: 'Bot Token', type: 'password', required: true },
      { key: 'applicationId', label: 'Application ID', type: 'text', required: true },
      { key: 'guilds', label: 'Server IDs (comma separated)', type: 'text' },
    ],
  },
  WHATSAPP: {
    name: 'WhatsApp',
    icon: Phone,
    fields: [],
  },
  SLACK: {
    name: 'Slack',
    icon: Hash,
    fields: [
      { key: 'botToken', label: 'Bot OAuth Token', type: 'password', required: true },
      { key: 'appToken', label: 'App Token', type: 'password', required: true },
    ],
  },
  SIGNAL: {
    name: 'Signal',
    icon: Phone,
    fields: [
      { key: 'phoneNumber', label: 'Phone Number', type: 'text', required: true },
    ],
  },
  MATRIX: {
    name: 'Matrix',
    icon: Hash,
    fields: [
      { key: 'homeserverUrl', label: 'Homeserver URL', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'userId', label: 'User ID', type: 'text' },
    ],
  },
}

interface ChannelSettingsProps {
  config: any
  onConfigChange: () => void
}

export function ChannelSettings({ config, onConfigChange }: ChannelSettingsProps) {
  const [channels, setChannels] = useState<any[]>(config?.channels || [])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [addingType, setAddingType] = useState('')

  const updateChannel = (id: string, updates: Record<string, any>) => {
    setChannels(prev =>
      prev.map(ch => ch.id === id ? { ...ch, config: { ...ch.config, ...updates } } : ch)
    )
    setHasChanges(true)
  }

  const updateAllowlist = (id: string, allowlist: string[]) => {
    updateChannel(id, { allowlist })
  }

  const removeChannel = (id: string) => {
    setChannels(prev => prev.filter(ch => ch.id !== id))
    setHasChanges(true)
  }

  const addChannel = () => {
    if (!addingType) return
    const info = CHANNEL_INFO[addingType]
    if (!info) return

    const newChannel = {
      id: `new-${Date.now()}`,
      type: addingType,
      enabled: true,
      config: {},
      _isNew: true,
    }
    setChannels(prev => [...prev, newChannel])
    setExpandedId(newChannel.id)
    setAddingType('')
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const existingChannels = channels.filter(ch => !ch._isNew)
      const newChannels = channels.filter(ch => ch._isNew)
      const removedIds = (config?.channels || [])
        .filter((ch: any) => !channels.find(c => c.id === ch.id))
        .map((ch: any) => ch.id)

      const body: any = {}
      if (newChannels.length) {
        body.add = newChannels.map(ch => ({ type: ch.type, config: ch.config }))
      }
      if (existingChannels.length) {
        body.update = existingChannels.map(ch => ({ id: ch.id, config: ch.config }))
      }
      if (removedIds.length) {
        body.remove = removedIds
      }

      const res = await fetch('/api/instance/config/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error((await res.json()).error)
      setHasChanges(false)
      onConfigChange()
    } catch (err: any) {
      alert(err.message || 'Failed to update channels')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setChannels(config?.channels || [])
    setHasChanges(false)
  }

  const configuredTypes = channels.map(ch => ch.type)
  const availableTypes = Object.keys(CHANNEL_INFO).filter(t => !configuredTypes.includes(t))

  return (
    <div className="space-y-4">
      {/* Configured Channels */}
      {channels.map(channel => {
        const info = CHANNEL_INFO[channel.type]
        if (!info) return null
        const Icon = info.icon
        const isExpanded = expandedId === channel.id

        return (
          <Card key={channel.id} className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : channel.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{info.name}</p>
                  <p className="text-[10px] text-white/30 font-mono">
                    {channel._isNew ? 'New — configure below' : 'Connected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${channel.enabled ? 'bg-red-500' : 'bg-white/20'}`} />
                {isExpanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
              </div>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-4 border-t border-red-500/10">
                {/* Channel-specific fields */}
                {info.fields.map(field => (
                  <div key={field.key} className="space-y-1.5 pt-3">
                    <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <Input
                      type={field.type}
                      value={channel.config[field.key] || ''}
                      onChange={e => updateChannel(channel.id, { [field.key]: e.target.value })}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}

                {/* Allowlist */}
                <div className="pt-2">
                  <AllowlistEditor
                    value={Array.isArray(channel.config.allowlist) ? channel.config.allowlist : []}
                    onChange={list => updateAllowlist(channel.id, list)}
                    placeholder={channel.type === 'TELEGRAM' ? '@username' : 'User ID...'}
                    label={`${info.name} Allowlist`}
                  />
                </div>

                {/* Remove button */}
                <div className="pt-3 border-t border-red-500/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeChannel(channel.id)}
                    className="h-7 px-3 border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 text-xs font-mono"
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    Remove {info.name}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Add Channel */}
      {availableTypes.length > 0 && (
        <Card className="border border-dashed border-white/10 bg-white/[0.01] text-white overflow-hidden">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Select
                value={addingType}
                onValueChange={setAddingType}
                className="flex-1"
              >
                <SelectOption value="">Add a channel...</SelectOption>
                {availableTypes.map(type => (
                  <SelectOption key={type} value={type}>
                    {CHANNEL_INFO[type]?.name || type}
                  </SelectOption>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={addChannel}
                disabled={!addingType}
                className="h-9 px-3 border-red-500/20 text-red-400 hover:border-red-500/40 hover:bg-red-500/5 disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {channels.length === 0 && (
        <div className="text-center py-8 text-white/20 font-mono text-sm">
          No channels configured. Add one above.
        </div>
      )}

      <ConfigSaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
