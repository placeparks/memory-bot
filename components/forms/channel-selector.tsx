'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Send, Hash } from 'lucide-react'

interface ChannelField {
  key: string
  label: string
  placeholder: string
  type: string
  required?: boolean
  options?: { label: string; value: string }[]
}

interface Channel {
  type: string
  name: string
  icon: any
  description: string
  badge?: string
  popular?: boolean
  fields?: ChannelField[]
  helpUrl?: string
}

const availableChannels: Channel[] = [
  {
    type: 'TELEGRAM',
    name: 'Telegram',
    icon: Send,
    description: 'Create bot with @BotFather',
    popular: true,
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', type: 'password', required: true },
      { key: 'allowlist', label: 'Allowed Usernames (optional)', placeholder: '@username1, @username2', type: 'text' }
    ],
    helpUrl: 'https://t.me/botfather'
  },
  {
    type: 'DISCORD',
    name: 'Discord',
    icon: Hash,
    description: 'Create bot in Discord Developer Portal',
    fields: [
      { key: 'token', label: 'Bot Token', placeholder: 'Your bot token', type: 'password', required: true },
      { key: 'applicationId', label: 'Application ID', placeholder: 'Your application ID', type: 'text', required: true },
      { key: 'guilds', label: 'Server IDs (comma-separated)', placeholder: '123456789012345678, 987654321098765432', type: 'text' }
    ],
    helpUrl: 'https://discord.com/developers/applications'
  },
]

interface ChannelSelectorProps {
  channels: any[]
  onChange: (channels: any[]) => void
}

export default function ChannelSelector({ channels, onChange }: ChannelSelectorProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    channels.map(c => c.type) || []
  )
  const [channelConfigs, setChannelConfigs] = useState<Record<string, any>>(
    channels.reduce((acc, c) => ({ ...acc, [c.type]: c.config }), {})
  )

  const toggleChannel = (channelType: string) => {
    const newSelected = selectedChannels.includes(channelType)
      ? selectedChannels.filter(c => c !== channelType)
      : [...selectedChannels, channelType]

    setSelectedChannels(newSelected)
    updateChannels(newSelected, channelConfigs)
  }

  const updateChannelConfig = (channelType: string, field: string, value: string | boolean) => {
    const newConfigs = {
      ...channelConfigs,
      [channelType]: {
        ...channelConfigs[channelType],
        [field]: value
      }
    }
    setChannelConfigs(newConfigs)
    updateChannels(selectedChannels, newConfigs)
  }

  const updateChannels = (selected: string[], configs: Record<string, any>) => {
    const newChannels = selected.map(type => ({
      type,
      config: configs[type] || {}
    }))
    onChange(newChannels)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white/90">Select Channels</h3>
        <p className="text-sm text-white/40 font-mono mb-4">
          Choose which messaging platforms you want to connect your bot to.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {availableChannels.map(channel => {
          const Icon = channel.icon
          const isSelected = selectedChannels.includes(channel.type)

          return (
            <div key={channel.type}>
              <Card
                className={`p-4 cursor-pointer border transition-all duration-300 ${
                  isSelected
                    ? 'border-red-500/50 bg-red-500/[0.04] ring-2 ring-red-500/40'
                    : 'border-white/10 bg-white/[0.02] hover:border-red-500/30'
                }`}
                onClick={() => toggleChannel(channel.type)}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleChannel(channel.type)}
                    onClick={(e) => e.stopPropagation()}
                    className="border-white/30 data-[state=checked]:bg-red-600 data-[state=checked]:text-white data-[state=checked]:border-red-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-white/90">{channel.name}</span>
                      {channel.popular && (
                        <span className="bg-red-600 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Popular
                        </span>
                      )}
                      {channel.badge && (
                        <span className="text-[10px] border border-red-500/30 text-red-400 bg-transparent px-2 py-0.5 rounded-full font-mono">
                          {channel.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/40">{channel.description}</p>
                    {channel.helpUrl && (
                      <a
                        href={channel.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300 hover:underline mt-1 inline-block transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Setup guide&nbsp;&rarr;
                      </a>
                    )}
                  </div>
                </div>
              </Card>

              {/* Configuration Fields */}
              {isSelected && channel.fields && (
                <Card className="mt-2 p-4 border border-red-500/10 bg-white/[0.02]">
                  <div className="space-y-3">
                    {channel.fields.map(field => (
                      <div key={field.key}>
                        {field.type !== 'checkbox' && (
                          <Label htmlFor={`${channel.type}-${field.key}`} className="text-sm text-white/60">
                            {field.label}
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                          </Label>
                        )}
                        {field.type === 'textarea' ? (
                          <textarea
                            id={`${channel.type}-${field.key}`}
                            placeholder={field.placeholder}
                            value={channelConfigs[channel.type]?.[field.key] || ''}
                            onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.value)}
                            className="w-full min-h-[100px] rounded-md border border-red-500/15 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-red-500/40 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            id={`${channel.type}-${field.key}`}
                            value={channelConfigs[channel.type]?.[field.key] || (field.options?.[0]?.value ?? '')}
                            onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-md border border-red-500/15 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-red-500/40 transition-colors"
                          >
                            {field.options?.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'checkbox' ? (
                          <label className="mt-2 flex items-center gap-2 text-sm text-white/60">
                            <input
                              id={`${channel.type}-${field.key}`}
                              type="checkbox"
                              checked={Boolean(channelConfigs[channel.type]?.[field.key])}
                              onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.checked)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-white/30 bg-white/5 accent-red-500"
                            />
                            {field.label}
                          </label>
                        ) : (
                          <Input
                            id={`${channel.type}-${field.key}`}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={channelConfigs[channel.type]?.[field.key] || ''}
                            onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="border-red-500/15 bg-white/[0.03] text-white placeholder:text-white/20 focus:border-red-500/40"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )
        })}
      </div>

      {selectedChannels.length === 0 && (
        <div className="text-center py-8 text-white/30 font-mono text-sm">
          Select at least one channel to continue
        </div>
      )}
    </div>
  )
}
