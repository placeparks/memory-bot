'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Headphones, User, Hash, Sparkles, Check } from 'lucide-react'

const templates = [
  {
    id: 'support',
    name: 'Customer Support Bot',
    description: 'A helpful support agent that answers questions, resolves issues, and escalates when needed.',
    badge: 'Popular',
    icon: Headphones,
    chips: ['TELEGRAM'],
    preset: {
      provider: 'ANTHROPIC',
      channels: [
        { type: 'TELEGRAM', config: {} }
      ]
    }
  },
  {
    id: 'assistant',
    name: 'Personal Assistant',
    description: 'Your all-purpose AI companion with web search and scheduling.',
    badge: 'Popular',
    icon: User,
    chips: ['TELEGRAM', 'DISCORD', 'Web Search', 'Scheduling'],
    preset: {
      provider: 'OPENAI',
      channels: [
        { type: 'TELEGRAM', config: {} },
        { type: 'DISCORD', config: {} }
      ],
      webSearchEnabled: true,
      cronEnabled: true
    }
  },
  {
    id: 'discord-community',
    name: 'Discord Community Bot',
    description: 'Engage your Discord community with an AI that answers questions and moderates.',
    icon: Hash,
    chips: ['DISCORD', 'Web Search'],
    preset: {
      provider: 'OPENAI',
      channels: [
        { type: 'DISCORD', config: {} }
      ],
      webSearchEnabled: true
    }
  },
  {
    id: 'scratch',
    name: 'Start from Scratch',
    description: 'Full control over every setting. Choose your own channels, model, skills, and system prompt.',
    icon: Sparkles,
    chips: [],
    preset: {
      channels: []
    }
  }
]

interface TemplateSelectionProps {
  selectedTemplate: string
  onSelect: (templateId: string, preset: Record<string, any>) => void
}

export default function TemplateSelection({ selectedTemplate, onSelect }: TemplateSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white/90">Template</h3>
        <p className="text-sm text-white/40 font-mono mb-4">
          Pick a template to pre-configure your bot, or start from scratch for full control.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id

          return (
            <Card
              key={template.id}
              className={`p-4 border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'border-red-500/50 bg-red-500/[0.04] ring-2 ring-red-500/40 shadow-[0_0_25px_rgba(220,38,38,0.12)]'
                  : 'border-white/10 bg-white/[0.02] hover:border-red-500/30'
              }`}
              onClick={() => onSelect(template.id, template.preset)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-colors duration-300 ${
                    isSelected ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-white/5'
                  }`}>
                    <Icon className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white/90">{template.name}</p>
                    <p className="text-sm text-white/40 mt-1">{template.description}</p>
                  </div>
                </div>
                {template.badge && (
                  <span className="shrink-0 bg-red-600 text-white text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {template.badge}
                  </span>
                )}
              </div>

              {template.chips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-red-500/15 bg-red-500/[0.04] px-3 py-1 text-xs text-red-500/50 font-mono"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className={`transition-all duration-300 ${
                    isSelected
                      ? 'border-red-500/40 text-red-400 bg-red-500/5'
                      : 'border-white/15 text-red-500/50 hover:border-red-500/40 hover:text-black-400'
                  }`}
                >
                  {isSelected ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" /> Selected
                    </span>
                  ) : (
                    'Choose Template'
                  )}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
