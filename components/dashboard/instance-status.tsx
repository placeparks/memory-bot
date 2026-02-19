'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Activity, Clock, Server, Wifi, Cpu, Shield } from 'lucide-react'
import { InstanceStatus as InstanceStatusEnum } from '@prisma/client'

interface Instance {
  id: string
  status: InstanceStatusEnum
  port: number
  accessUrl: string | null
  lastHealthCheck: Date | null
  isHealthy?: boolean
}

interface InstanceStatusProps {
  instance: Instance
  onAction: (action: 'start' | 'stop' | 'restart') => void
  actionLoading: boolean
}

const statusConfig: Record<InstanceStatusEnum, { label: string; color: string; dotColor: string; glow: string }> = {
  RUNNING: {
    label: 'RUNNING',
    color: 'text-red-400',
    dotColor: 'bg-red-500',
    glow: 'shadow-[0_0_10px_rgba(220,38,38,0.5)]',
  },
  STOPPED: {
    label: 'STOPPED',
    color: 'text-white/30',
    dotColor: 'bg-white/20',
    glow: '',
  },
  DEPLOYING: {
    label: 'DEPLOYING',
    color: 'text-amber-400',
    dotColor: 'bg-amber-500',
    glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]',
  },
  ERROR: {
    label: 'ERROR',
    color: 'text-red-500',
    dotColor: 'bg-red-600',
    glow: 'shadow-[0_0_10px_rgba(220,38,38,0.6)]',
  },
  RESTARTING: {
    label: 'RESTARTING',
    color: 'text-blue-400',
    dotColor: 'bg-blue-500',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]',
  },
}

export default function InstanceStatus({ instance, onAction, actionLoading }: InstanceStatusProps) {
  const status = statusConfig[instance.status]
  const isOnline = instance.isHealthy

  const stats = [
    {
      icon: Activity,
      label: 'Health',
      value: isOnline ? 'Healthy' : 'Down',
      active: isOnline,
    },
    {
      icon: Server,
      label: 'Status',
      value: status.label,
      active: instance.status === 'RUNNING',
    },
    {
      icon: Wifi,
      label: 'Gateway',
      value: instance.accessUrl ? 'Connected' : 'No URL',
      active: !!instance.accessUrl,
    },
    {
      icon: Clock,
      label: 'Last Check',
      value: instance.lastHealthCheck
        ? new Date(instance.lastHealthCheck).toLocaleTimeString('en-US', { hour12: false })
        : 'Never',
      active: !!instance.lastHealthCheck,
    },
  ]

  return (
    <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
      {/* Terminal-style header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-red-500/10 bg-[#0a0a0a]/50">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <span className="ml-2 text-[9px] font-mono text-red-500/50 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="h-3 w-3" /> instance-monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-1.5 h-1.5 rounded-full ${status.dotColor} ${status.glow}`}
            animate={instance.status === 'RUNNING' ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className={`text-[9px] font-mono uppercase tracking-wider ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <CardContent className="pt-6 pb-5">
        {/* Status hero */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {/* Orbital ring */}
            <motion.div
              className={`w-16 h-16 rounded-full border-2 ${
                isOnline ? 'border-red-500/30' : 'border-white/10'
              } flex items-center justify-center`}
              animate={isOnline ? { rotate: 360 } : {}}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div className={`w-10 h-10 rounded-full ${
                isOnline ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5 border border-white/10'
              } flex items-center justify-center`}>
                <Activity className={`h-5 w-5 ${isOnline ? 'text-red-400' : 'text-white/20'}`} />
              </div>
            </motion.div>
            {/* Orbital dot */}
            {isOnline && (
              <motion.div
                className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(220,38,38,0.6)]"
                style={{ top: -1, left: '50%', marginLeft: -4 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold">
              {isOnline ? 'Agent Operational' : 'Agent Offline'}
            </h3>
            <p className="text-xs text-white/50 font-mono mt-0.5">
              {isOnline
                ? 'All systems nominal. Listening on configured channels.'
                : 'Instance is not responding. Try restarting.'}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={`rounded-lg border p-3 transition-all duration-300 ${
                stat.active
                  ? 'border-red-500/15 bg-red-500/[0.03]'
                  : 'border-white/5 bg-white/[0.01]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-3.5 w-3.5 ${stat.active ? 'text-red-500/70' : 'text-white/15'}`} />
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-sm font-semibold font-mono ${stat.active ? 'text-white/80' : 'text-white/30'}`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
