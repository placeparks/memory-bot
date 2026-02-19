'use client'

import * as React from 'react'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>')
  return ctx
}

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`flex gap-1 border-b border-red-500/10 pb-px ${className}`} style={style}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { value: active, onValueChange } = useTabs()
  const isActive = active === value

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-xs font-mono uppercase tracking-wider transition-all duration-300 border-b-2 -mb-px ${
        isActive
          ? 'border-red-500 text-red-400 bg-red-500/5'
          : 'border-transparent text-white/30 hover:text-white/50 hover:bg-white/[0.02]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { value: active } = useTabs()
  if (active !== value) return null

  return <div className={`pt-6 ${className}`}>{children}</div>
}
