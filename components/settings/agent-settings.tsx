'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectOption } from '@/components/ui/select'
import { Bot, Key, Eye, EyeOff, ExternalLink } from 'lucide-react'
import { ConfigSaveBar } from './config-save-bar'
import { PROVIDERS, getModelsForProvider, getDefaultModel, getProviderDef } from '@/lib/models'

interface AgentSettingsProps {
  config: any
  onConfigChange: () => void
}

export function AgentSettings({ config, onConfigChange }: AgentSettingsProps) {
  const [agentName, setAgentName] = useState(config?.agentName || '')
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt || '')
  const [provider, setProvider] = useState(config?.provider || 'ANTHROPIC')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(config?.model || '')
  const [thinkingMode, setThinkingMode] = useState(config?.thinkingMode || 'high')
  const [showKey, setShowKey] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!config) return
    const changed =
      agentName !== (config.agentName || '') ||
      systemPrompt !== (config.systemPrompt || '') ||
      provider !== config.provider ||
      apiKey !== '' ||
      model !== config.model ||
      thinkingMode !== config.thinkingMode
    setHasChanges(changed)
  }, [agentName, systemPrompt, provider, apiKey, model, thinkingMode, config])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = {}
      if (agentName !== (config?.agentName || '')) body.agentName = agentName
      if (systemPrompt !== (config?.systemPrompt || '')) body.systemPrompt = systemPrompt
      if (provider !== config?.provider) body.provider = provider
      if (apiKey) body.apiKey = apiKey
      if (model !== config?.model) body.model = model
      if (thinkingMode !== config?.thinkingMode) body.thinkingMode = thinkingMode

      const res = await fetch('/api/instance/config/agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error((await res.json()).error)
      setApiKey('')
      setHasChanges(false)
      onConfigChange()
    } catch (err: any) {
      alert(err.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setAgentName(config?.agentName || '')
    setSystemPrompt(config?.systemPrompt || '')
    setProvider(config?.provider || 'ANTHROPIC')
    setApiKey('')
    setModel(config?.model || '')
    setThinkingMode(config?.thinkingMode || 'high')
    setHasChanges(false)
  }

  const providerDef = PROVIDERS.find(p => p.id === provider)
  const models = getModelsForProvider(provider)

  return (
    <div className="space-y-6">
      {/* Agent Identity */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">agent-identity</span>
        </div>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Agent Name</label>
            <Input
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Clawd"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">System Prompt</label>
            <Textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful AI assistant..."
              rows={5}
            />
            <p className="text-[10px] text-white/15 font-mono">
              Defines your bot&apos;s personality and behavior
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Provider */}
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">ai-provider</span>
        </div>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProvider(p.id)
                  setModel(p.defaultModel)
                }}
                className={`p-2.5 rounded-lg border text-left transition-all duration-300 ${
                  provider === p.id
                    ? 'border-red-500/40 bg-red-500/10 shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <p className="text-xs font-medium truncate leading-tight">{p.name}</p>
                {p.badge && (
                  <span className="mt-0.5 inline-block px-1 py-0.5 rounded text-[7px] font-mono uppercase tracking-wide bg-red-500/10 text-red-400/60 border border-red-500/15">
                    {p.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={config?.apiKey ? `Current: ${config.apiKey}` : 'Enter API key...'}
                  className="h-9 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {providerDef?.getKeyUrl && (
                <button
                  type="button"
                  onClick={() => window.open(providerDef.getKeyUrl, '_blank')}
                  className="h-9 px-3 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 text-[10px] font-mono flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  Get Key
                </button>
              )}
            </div>
            <p className="text-[10px] text-white/15 font-mono">Leave blank to keep current key</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Model</label>
            <Select value={model} onValueChange={setModel}>
              {models.map(m => (
                <SelectOption key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </SelectOption>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/20 font-mono uppercase tracking-wider">Thinking Mode</label>
            <Select value={thinkingMode} onValueChange={setThinkingMode}>
              <SelectOption value="high">High (Most thorough)</SelectOption>
              <SelectOption value="medium">Medium (Balanced)</SelectOption>
              <SelectOption value="low">Low (Fastest)</SelectOption>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ConfigSaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
