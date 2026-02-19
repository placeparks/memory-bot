'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ExternalLink, Eye, EyeOff, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROVIDERS } from '@/lib/models'

interface ProviderConfigProps {
  config: any
  onChange: (updates: any) => void
}

export default function ProviderConfig({ config, onChange }: ProviderConfigProps) {
  const selectedProvider = PROVIDERS.find(p => p.id === config.provider)
  const [showApiKey, setShowApiKey] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const maxDropdownH = 240 // max-h-60 = 15rem = 240px

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const openUp = spaceBelow < maxDropdownH && spaceAbove > spaceBelow
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        openUp,
      })
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (modelOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [modelOpen, updatePosition])

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <Label className="text-lg mb-4 block text-white/90">Choose AI Provider</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PROVIDERS.map(p => {
            const isSelected = config.provider === p.id
            return (
              <Card
                key={p.id}
                className={`p-3 sm:p-4 cursor-pointer border transition-all duration-300 ${
                  isSelected
                    ? 'border-red-500/50 bg-red-500/[0.04] ring-2 ring-red-500/40 shadow-[0_0_25px_rgba(220,38,38,0.12)]'
                    : 'border-white/10 bg-white/[0.02] hover:border-red-500/30'
                }`}
                onClick={() => onChange({ provider: p.id, model: p.defaultModel })}
              >
                <div className="mb-1.5">
                  <h4 className="font-semibold text-white/90 text-sm leading-tight">{p.name}</h4>
                  {p.badge && (
                    <span className="mt-1 inline-block bg-red-600 text-white text-[8px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 line-clamp-2">{p.description}</p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* API Key Input */}
      {selectedProvider?.noKeyRequired ? (
        <div>
          <Label htmlFor="apiKey" className="text-lg mb-2 block text-white/90">
            Host URL (Optional)
          </Label>
          <p className="text-sm text-white/60 mb-3">
            No API key needed. Provide the host URL if not using the default (http://localhost:11434).
          </p>
          <Input
            id="apiKey"
            type="text"
            placeholder="http://localhost:11434"
            value={config.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            className="border-red-500/15 bg-white/[0.03] text-white placeholder:text-white/20 focus:border-red-500/40"
          />
        </div>
      ) : (
        <div>
          <Label htmlFor="apiKey" className="text-lg mb-2 block text-white/90">
            API Key
          </Label>
          <p className="text-sm text-white/60 mb-3">
            Your API key is encrypted and never shared. We use it only to run your bot.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder={`Enter your ${selectedProvider?.name || 'provider'} API key`}
                value={config.apiKey}
                onChange={(e) => onChange({ apiKey: e.target.value })}
                className="pr-10 border-red-500/15 bg-white/[0.03] text-white placeholder:text-white/20 focus:border-red-500/40"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4 text-white/30 hover:text-white/50 transition-colors" />
                ) : (
                  <Eye className="h-4 w-4 text-white/30 hover:text-white/50 transition-colors" />
                )}
              </button>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedProvider) window.open(selectedProvider.getKeyUrl, '_blank')
              }}
              className="shrink-0 border-red-500/30 text-red-400 hover:border-red-500/50 hover:text-red-300 hover:bg-red-500/5 px-3"
            >
              <ExternalLink className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Get Key</span>
            </Button>
          </div>
        </div>
      )}

      {/* Model Selection (Optional) */}
      <div>
        <Label htmlFor="model" className="text-lg mb-2 block text-white/90">
          Model (Optional)
        </Label>
        <p className="text-sm text-white/60 mb-3">
          We{"'"}ll use the best model by default. Advanced users can override this.
        </p>
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => { updatePosition(); setModelOpen(!modelOpen) }}
            className="w-full h-10 rounded-md border border-red-500/15 bg-white/[0.03] px-3 py-2 text-sm text-left text-white focus:border-red-500/40 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition-colors flex items-center justify-between"
          >
            <span className={config.model ? 'text-white' : 'text-white/50'}>
              {config.model
                ? selectedProvider?.models.find(m => m.id === config.model)?.name || config.model
                : 'Default (Recommended)'}
            </span>
            <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
          </button>
          {modelOpen && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] max-h-60 overflow-auto rounded-md border border-red-500/20 bg-[#0a0a0a] shadow-lg shadow-black/50"
              style={{
                left: dropdownPos.left,
                width: dropdownPos.width,
                ...(dropdownPos.openUp
                  ? { bottom: window.innerHeight - dropdownPos.top, top: 'auto' }
                  : { top: dropdownPos.top }),
              }}
            >
              <div
                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                  !config.model ? 'text-red-400 bg-red-500/10' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                }`}
                onClick={() => { onChange({ model: '' }); setModelOpen(false) }}
              >
                <span>Default (Recommended)</span>
                {!config.model && <Check className="h-3.5 w-3.5 text-red-400" />}
              </div>
              {PROVIDERS
                .find(p => p.id === config.provider)
                ?.models.map(m => {
                  const isActive = config.model === m.id
                  return (
                    <div
                      key={m.id}
                      className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                        isActive ? 'text-red-400 bg-red-500/10' : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
                      }`}
                      onClick={() => { onChange({ model: m.id }); setModelOpen(false) }}
                    >
                      <span className="truncate min-w-0">{m.name}<span className="text-white/30 hidden sm:inline"> — {m.description}</span></span>
                      {isActive && <Check className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                    </div>
                  )
                })}
            </div>,
            document.body
          )}
        </div>
      </div>
    </div>
  )
}
