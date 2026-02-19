'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ConfigSaveBar } from './config-save-bar'
import { Search, Globe, Mic, Layout, Clock, Eye, EyeOff } from 'lucide-react'

const SKILLS: { key: string; name: string; icon: any; apiKeyField?: string; apiLabel?: string; badge?: string }[] = [
  { key: 'webSearchEnabled', name: 'Web Search', icon: Search, apiKeyField: 'braveApiKey', apiLabel: 'Brave API Key', badge: 'Popular' },
  { key: 'browserEnabled', name: 'Browser Automation', icon: Globe, badge: 'Advanced' },
  { key: 'ttsEnabled', name: 'Text-to-Speech', icon: Mic, apiKeyField: 'elevenlabsApiKey', apiLabel: 'ElevenLabs API Key' },
  { key: 'canvasEnabled', name: 'Canvas', icon: Layout, badge: 'Beta' },
  { key: 'cronEnabled', name: 'Scheduled Tasks', icon: Clock },
]

interface SkillsSettingsProps {
  config: any
  onConfigChange: () => void
}

export function SkillsSettings({ config, onConfigChange }: SkillsSettingsProps) {
  const [skills, setSkills] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    const s: Record<string, boolean> = {}
    SKILLS.forEach(skill => {
      s[skill.key] = config[skill.key] || false
    })
    setSkills(s)
  }, [config])

  const toggleSkill = (key: string, enabled: boolean) => {
    setSkills(prev => ({ ...prev, [key]: enabled }))
    setHasChanges(true)
  }

  const setApiKey = (key: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = { ...skills }
      Object.entries(apiKeys).forEach(([key, value]) => {
        if (value) body[key] = value
      })

      const res = await fetch('/api/instance/config/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error((await res.json()).error)
      setApiKeys({})
      setHasChanges(false)
      onConfigChange()
    } catch (err: any) {
      alert(err.message || 'Failed to update skills')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    const s: Record<string, boolean> = {}
    SKILLS.forEach(skill => {
      s[skill.key] = config?.[skill.key] || false
    })
    setSkills(s)
    setApiKeys({})
    setHasChanges(false)
  }

  return (
    <div className="space-y-3">
      {SKILLS.map(skill => {
        const Icon = skill.icon
        const enabled = skills[skill.key] || false

        return (
          <Card key={skill.key} className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                    enabled
                      ? 'border-red-500/30 bg-red-500/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}>
                    <Icon className={`h-4 w-4 ${enabled ? 'text-red-400' : 'text-white/30'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{skill.name}</p>
                      {skill.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-red-500/10 text-red-400/60 border border-red-500/15">
                          {skill.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={v => toggleSkill(skill.key, v)} />
              </div>

              {/* API Key field (if skill has one and is enabled) */}
              {'apiKeyField' in skill && skill.apiKeyField && enabled && (
                <div className="mt-4 pt-3 border-t border-red-500/10 space-y-1.5">
                  <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">
                    {skill.apiLabel}
                  </label>
                  <div className="relative">
                    <Input
                      type={showKeys[skill.apiKeyField] ? 'text' : 'password'}
                      value={apiKeys[skill.apiKeyField] || ''}
                      onChange={e => setApiKey(skill.apiKeyField!, e.target.value)}
                      placeholder={config?.[skill.apiKeyField] ? `Current: ${config[skill.apiKeyField]}` : 'Enter API key...'}
                      className="h-8 text-xs pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys(prev => ({ ...prev, [skill.apiKeyField!]: !prev[skill.apiKeyField!] }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                    >
                      {showKeys[skill.apiKeyField] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/15 font-mono">Leave blank to keep current key</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      <ConfigSaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
