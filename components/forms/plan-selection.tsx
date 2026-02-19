'use client'

import { Check, Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'

const plans = [
  {
    id: 'MONTHLY',
    name: 'Monthly',
    price: 35,
    period: '/month',
    description: 'Try it out. Cancel anytime.',
    features: ['All features included', 'Unlimited messages', 'All channels', '24/7 support']
  },
  {
    id: 'YEARLY',
    name: 'Yearly',
    price: 320,
    pricePerMonth: 24.92,
    period: '/year',
    discount: 14,
    badge: 'BEST VALUE',
    popular: true,
    description: 'Best value. Save $49.',
    features: ['All features included', 'Unlimited messages', 'All channels', 'Priority support', 'Save $49']
  }
]

interface PlanSelectionProps {
  selectedPlan: string
  onSelect: (plan: string) => void
}

export default function PlanSelection({ selectedPlan, onSelect }: PlanSelectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
      {plans.map((plan, i) => {
        const isSelected = selectedPlan === plan.id
        return (
          <Card
            key={plan.id}
            className={`relative cursor-pointer border transition-all duration-300 ${
              isSelected
                ? 'border-red-500/50 bg-red-500/[0.04] ring-2 ring-red-500/40 shadow-[0_0_30px_rgba(220,38,38,0.15)]'
                : plan.popular
                ? 'border-red-500/25 bg-white/[0.02] hover:border-red-500/50'
                : 'border-white/10 bg-white/[0.02] hover:border-red-500/30'
            }`}
            onClick={() => onSelect(plan.id)}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-red-600 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="p-6">
              <div className="text-xs font-mono text-red-500/60 uppercase tracking-wider">{plan.name}</div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-sm text-white/30 font-mono mb-1">{plan.period}</span>
              </div>
              {plan.pricePerMonth && (
                <p className="text-xs text-white/60 font-mono mt-1">
                  ${plan.pricePerMonth}/month
                </p>
              )}
              <p className="mt-2 text-xs text-white/60 font-mono">{plan.description}</p>

              <div className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-1 h-1 rounded-full bg-red-500" />
                    <span className="font-mono text-xs">{feature}</span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <div className="mt-6 p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-center">
                  <span className="text-red-400 font-semibold text-sm flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4" /> Selected
                  </span>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
