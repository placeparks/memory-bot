'use client'

import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Globe, Mic, Layout, Clock, ExternalLink } from 'lucide-react'

const skills = [
  {
    key: 'webSearchEnabled',
    name: 'Web Search',
    icon: Search,
    description: 'Search the web for real-time information',
    badge: 'Popular',
    apiKeyField: 'braveApiKey',
    apiKeyLabel: 'Brave API Key',
    apiKeyPlaceholder: 'Enter Brave Search API key',
    getKeyUrl: 'https://brave.com/search/api/'
  },
  {
    key: 'browserEnabled',
    name: 'Browser Automation',
    icon: Globe,
    description: 'Navigate websites and extract information',
    badge: 'Advanced'
  },
  {
    key: 'ttsEnabled',
    name: 'Text-to-Speech',
    icon: Mic,
    description: 'Generate natural voice responses',
    apiKeyField: 'elevenlabsApiKey',
    apiKeyLabel: 'ElevenLabs API Key',
    apiKeyPlaceholder: 'Enter ElevenLabs API key',
    getKeyUrl: 'https://elevenlabs.io/'
  },
  {
    key: 'canvasEnabled',
    name: 'Canvas',
    icon: Layout,
    description: 'Visual workspace for agent interactions',
    badge: 'Beta'
  },
  {
    key: 'cronEnabled',
    name: 'Scheduled Tasks',
    icon: Clock,
    description: 'Run tasks on a schedule'
  }
]

interface SkillsConfigProps {
  config: any
  onChange: (updates: any) => void
}

export default function SkillsConfig({ config, onChange }: SkillsConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white/90">Enable Skills (Optional)</h3>
        <p className="text-sm text-white/60 font-mono mb-4">
          Add extra capabilities to your AI assistant. You can skip this step and enable them later.
        </p>
      </div>

      <div className="space-y-4">
        {skills.map(skill => {
          const Icon = skill.icon
          const isEnabled = config[skill.key]

          return (
            <div key={skill.key}>
              <Card className={`p-4 border transition-all duration-300 ${
                isEnabled
                  ? 'border-red-500/30 bg-red-500/[0.03]'
                  : 'border-white/10 bg-white/[0.02]'
              }`}>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={(checked) => onChange({ [skill.key]: checked })}
                    className="border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:text-white data-[state=checked]:border-red-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className={`h-5 w-5 transition-colors duration-300 ${isEnabled ? 'text-red-400' : 'text-red-500/50'}`} />
                      <span className="font-semibold text-white/90">{skill.name}</span>
                      {skill.badge && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          skill.badge === 'Popular'
                            ? 'bg-red-600 text-white'
                            : 'border border-red-500/20 text-red-400/60 bg-red-500/[0.04]'
                        }`}>
                          {skill.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60">{skill.description}</p>
                  </div>
                </div>

                {/* API Key Field */}
                {isEnabled && skill.apiKeyField && (
                  <div className="mt-4 pl-7">
                    <Label htmlFor={skill.apiKeyField} className="text-sm mb-2 block text-white/60">
                      {skill.apiKeyLabel}
                      <span className="text-red-400 ml-1">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={skill.apiKeyField}
                        type="password"
                        placeholder={skill.apiKeyPlaceholder}
                        value={config[skill.apiKeyField] || ''}
                        onChange={(e) => onChange({ [skill.apiKeyField]: e.target.value })}
                        className="border-red-500/15 bg-white/[0.03] text-white placeholder:text-white/20 focus:border-red-500/40"
                      />
                      {skill.getKeyUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(skill.getKeyUrl, '_blank')}
                          className="px-4 py-2 border border-red-500/30 rounded-md text-red-400 hover:border-red-500/50 hover:text-red-300 hover:bg-red-500/5 flex items-center space-x-2 transition-all duration-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="text-sm">Get Key</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 border border-red-500/10 bg-white/[0.02] rounded-lg">
        <p className="text-sm text-white/50 font-mono">
          Skills can be enabled or disabled at any time from your dashboard after deployment.
        </p>
      </div>
    </div>
  )
}
