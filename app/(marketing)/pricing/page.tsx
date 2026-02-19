'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Check, Sparkles, Shield, ArrowRight, Menu, X, Flame, Terminal } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PricingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const plans = [
    {
      name: 'Monthly',
      price: 35,
      period: '/month',
      description: 'Try it out. Cancel anytime.',
      features: [
        'All features included',
        'Unlimited messages',
        'Telegram + Discord channels',
        'Skills & extensions',
        'Web search & browser',
        'Community access'
      ]
    },
    {
      name: 'Yearly',
      price: 320,
      pricePerMonth: 24.92,
      period: '/year',
      discount: 14,
      badge: 'BEST VALUE',
      popular: true,
      description: 'Best value. Save $100.',
      features: [
        'All features included',
        'Unlimited messages',
        'Telegram + Discord channels',
        'Skills & extensions',
        'Web search & browser',
        'Priority support',
        'Founding member perks'
      ]
    }
  ]

  return (
    <div
      className="min-h-screen bg-[#050505] text-white"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 pt-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/openclaw_icon.png" alt="Claw Club" width={36} height={36} className="drop-shadow-[0_0_10px_rgba(220,38,38,0.3)]" />
            <div>
              <span className="text-xl font-bold tracking-tight">Claw Club</span>
              <div className="text-[9px] uppercase tracking-[0.3em] text-red-500/50 font-mono">Members Only</div>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/login" className="text-white/60 hover:text-white transition font-mono text-xs">Login</Link>
            <Link
              href="/register"
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.2)]"
            >
              Get Started
            </Link>
          </div>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {mobileOpen && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-mono">
              <Link href="/login" className="text-white/60 hover:text-white transition" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link
                href="/register"
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500 transition"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/[0.06] via-[#0a0a0a] to-[#050505] p-10 md:p-14">
          <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-red-500/10 blur-[80px]" />
          <div className="relative grid lg:grid-cols-[1.2fr_0.8fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono mb-4">
                <Flame className="h-3 w-3" /> pricing
              </div>
              <h1 className="text-4xl md:text-5xl font-bold">
                Simple plans for <span className="text-red-500">Claw Club</span>
              </h1>
              <p className="mt-4 text-white/60 font-mono text-sm">
                All plans include full OpenClaw functionality, private instances, and multi-channel support.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-white/50">
                <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-red-500/50" /> Private containers</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-red-500/50" /> Unlimited messages</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-red-500/50" /> Telegram + Discord</div>
              </div>
            </div>
            <div className="rounded-xl border border-red-500/15 bg-white/[0.02] p-6 text-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-red-500/50 font-mono">Included</div>
              <ul className="mt-4 space-y-2 text-white/65 font-mono text-xs">
                {['OpenClaw gateway', 'Channel pairing', 'Skills & extensions', 'Web search & browser', 'Secure keys'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-red-500" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-14 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative rounded-xl border bg-white/[0.02] p-6 text-white ${
                plan.popular ? 'border-red-500/40 bg-red-500/[0.04] shadow-[0_0_30px_rgba(220,38,38,0.1)]' : 'border-red-500/15'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-red-600 text-white px-3 py-1 text-[10px] font-mono uppercase tracking-wider border-0">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xs font-mono text-red-500/60 uppercase tracking-wider">{plan.name}</h3>
                <p className="mt-1 text-xs text-white/55 font-mono">{plan.description}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-sm text-white/50 font-mono mb-1">{plan.period}</span>
                </div>
                {plan.pricePerMonth && (
                  <p className="text-[10px] text-white/45 mt-2 font-mono">${plan.pricePerMonth}/month effective</p>
                )}
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-xs text-white/70 font-mono">
                    <div className="w-1 h-1 rounded-full bg-red-500 mr-2 mt-1.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-2.5 rounded-lg text-sm font-semibold font-mono transition-all duration-300 ${
                  plan.popular
                    ? 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                    : 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                }`}
              >
                Get Started <ArrowRight className="inline h-4 w-4 ml-1" />
              </Link>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center">Frequently <span className="text-red-500">Asked</span></h2>
          <div className="mt-10 space-y-3">
            {[
              { q: 'Can I change plans later?', a: 'Yes. Upgrade or downgrade any time from your dashboard.' },
              { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee.' },
              { q: 'What payment methods do you accept?', a: 'All major cards via Stripe.' },
              { q: 'Any hidden fees?', a: 'No. AI provider API costs are billed directly by them.' },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-red-500/15 bg-white/[0.02] p-5 hover:border-red-500/30 transition-colors">
                <h3 className="font-semibold text-white/80 text-sm">{item.q}</h3>
                <p className="mt-2 text-xs text-white/60 font-mono">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-red-500/20 py-12 bg-[#080808]/50">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm font-mono text-white/55">
          <p>&copy; 2026 Claw Club. Built on OpenClaw. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
