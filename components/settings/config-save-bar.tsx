'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2, Save, RotateCw, X } from 'lucide-react'

interface ConfigSaveBarProps {
  show: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
}

export function ConfigSaveBar({ show, saving, onSave, onDiscard }: ConfigSaveBarProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2"
        >
          <div
            className="flex items-center justify-between gap-3 px-4 pt-3 border-t border-red-500/25 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-red-500/10 sm:justify-start sm:px-5 sm:rounded-xl sm:border"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2 sm:pr-3 sm:border-r sm:border-red-500/10">
              <RotateCw className="h-3.5 w-3.5 text-red-400 animate-pulse shrink-0" />
              <span className="text-xs font-mono text-white/50 whitespace-nowrap">
                Unsaved changes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onDiscard}
                disabled={saving}
                className="h-8 px-2.5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-xs font-mono"
              >
                <X className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">Discard</span>
              </Button>

              <Button
                size="sm"
                onClick={onSave}
                disabled={saving}
                className="h-8 px-4 bg-red-600 hover:bg-red-500 text-white border-0 text-xs font-mono"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1.5" />
                    Save & Apply
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
