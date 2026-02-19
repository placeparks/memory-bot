'use client'

import * as React from 'react'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, disabled = false, className = '' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'border-red-500/50 bg-red-500/20'
          : 'border-white/10 bg-white/5'
      } ${className}`}
    >
      <span
        className={`pointer-events-none block h-3.5 w-3.5 rounded-full shadow-lg transition-all duration-300 ${
          checked
            ? 'translate-x-4 bg-red-500'
            : 'translate-x-0.5 bg-white/30'
        }`}
      />
    </button>
  )
}
