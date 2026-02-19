'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { MessageSquare, TrendingUp, BarChart3 } from 'lucide-react'

interface UsageStatsProps {
  instance: any
}

function AnimatedValue({ value, suffix = '' }: { value: string | number | undefined; suffix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!isInView || value === undefined || value === null) return

    const numVal = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value
    if (isNaN(numVal)) {
      setDisplay(String(value))
      return
    }

    let start = 0
    const step = Math.ceil(numVal / 30)
    const timer = setInterval(() => {
      start += step
      if (start >= numVal) {
        setDisplay(typeof value === 'string' ? value : numVal.toLocaleString())
        clearInterval(timer)
      } else {
        setDisplay(start.toLocaleString())
      }
    }, 30)
    return () => clearInterval(timer)
  }, [isInView, value])

  return <span ref={ref}>{value ? display : '\u2014'}{value ? suffix : ''}</span>
}

export default function UsageStats({ instance }: UsageStatsProps) {
  const stats = instance?.stats || null

  const items = [
    {
      icon: MessageSquare,
      label: 'Messages',
      value: stats?.messagesProcessed,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
    },
    {
      icon: TrendingUp,
      label: 'Uptime',
      value: stats?.uptime,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
    },
  ]

  return (
    <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-red-500/10 bg-[#0a0a0a]/50">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <span className="ml-2 text-[9px] font-mono text-red-500/50 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3" /> usage-stats
          </span>
        </div>
        <span className="text-[9px] font-mono text-white/15">
          {stats ? 'last 30 days' : 'no data'}
        </span>
      </div>

      <CardContent className="pt-6 pb-5">
        <div className="grid grid-cols-2 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
              className="text-center"
            >
              <div className={`p-3 rounded-lg border ${item.bgColor} inline-flex items-center justify-center mb-3`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold font-mono">
                <AnimatedValue value={item.value} />
              </p>
              <p className="text-[10px] text-white/40 font-mono uppercase tracking-wider mt-1">{item.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-red-500/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 font-mono">
              {stats ? 'Detailed analytics coming soon' : 'Connect analytics to see real usage'}
            </p>
            <button className="text-xs text-red-400/60 hover:text-red-400 transition-colors font-mono">
              {stats ? 'View Full Report \u2192' : 'Enable Tracking \u2192'}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
