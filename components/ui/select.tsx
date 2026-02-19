'use client'

import * as React from 'react'

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function Select({ value, onValueChange, children, className = '', disabled }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      disabled={disabled}
      className={`flex h-9 w-full rounded-lg border border-red-500/15 bg-white/[0.03] px-3 py-1 text-sm text-white font-mono focus:outline-none focus:border-red-500/40 focus:ring-1 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 appearance-none cursor-pointer ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        colorScheme: 'dark',
      }}
    >
      {children}
    </select>
  )
}

export function SelectOption({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <option value={value} className="bg-[#0a0a0a] text-white">
      {children}
    </option>
  )
}
