'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight, Shield, Zap, MessageSquare, Terminal, Users, Crown,
  ChevronDown, ExternalLink, Play, Pause, RotateCcw, Cpu, Globe, Lock, Star, Flame,
  Hash, Activity, Clock, Award, Crosshair, Check, MessageCircle, Bot, Wifi
} from 'lucide-react'

// ─────────────────────────────────────────────────
// INTRO BOOT SEQUENCE
// ─────────────────────────────────────────────────
const bootLines = [
  { text: '> CLAW_CLUB_OS v3.7.1 — Initializing...', delay: 0 },
  { text: '> Loading kernel modules...', delay: 300 },
  { text: '  [OK] claw-agent-runtime', delay: 500 },
  { text: '  [OK] discord-bridge-v2', delay: 700 },
  { text: '  [OK] telegram-relay', delay: 850 },
  { text: '  [OK] neural-mesh-network', delay: 1000 },
  { text: '> Mounting encrypted volumes...', delay: 1200 },
  { text: '  [OK] /vault/keys — 256-bit AES', delay: 1400 },
  { text: '  [OK] /vault/agents — isolated sandbox', delay: 1550 },
  { text: '> Connecting to Claw Club network...', delay: 1750 },
  { text: '  [ACTIVE] agents online', delay: 1950 },
  { text: '  [ACTIVE] network operational', delay: 2100 },
  { text: '> Verifying member credentials...', delay: 2450 },
  { text: '  [OK] Claw Club gateway — ENABLED', delay: 2650 },
  { text: '> All systems operational.', delay: 2850 },
  { text: '', delay: 3000 },
  { text: '  ██████╗ ██╗       █████╗  ██╗    ██╗', delay: 3050 },
  { text: '  ██╔════╝ ██║      ██╔══██╗ ██║    ██║', delay: 3100 },
  { text: '  ██║      ██║      ███████║ ██║ █╗ ██║', delay: 3150 },
  { text: '  ██║      ██║      ██╔══██║ ██║███╗██║', delay: 3200 },
  { text: '  ╚██████╗ ███████╗ ██║  ██║ ╚███╔███╔╝', delay: 3250 },
  { text: '   ╚═════╝ ╚══════╝ ╚═╝  ╚═╝  ╚══╝╚══╝', delay: 3300 },
  { text: '           C L U B', delay: 3400 },
  { text: '', delay: 3500 },
  { text: '> Press any key to enter...', delay: 3700 },
]

function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    bootLines.forEach((line, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), line.delay))
    })
    timers.push(setTimeout(() => setShowSkip(true), 1500))
    const autoSkip = setTimeout(onComplete, 5500)
    timers.push(autoSkip)
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  useEffect(() => {
    const handler = (e: KeyboardEvent | MouseEvent) => {
      if (visibleLines > 5) onComplete()
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('click', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('click', handler)
    }
  }, [visibleLines, onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-[#050505] flex items-center justify-center scanlines noise"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full max-w-2xl px-6">
        <div className="terminal-window p-0 overflow-hidden">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500" />
            <div className="terminal-dot bg-red-900/50" />
            <div className="terminal-dot bg-red-900/50" />
            <span className="ml-2 text-[10px] font-mono text-red-500/60 uppercase tracking-wider">
              claw-club-terminal
            </span>
          </div>
          <div className="p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed h-[420px] sm:h-[480px] overflow-hidden">
            {bootLines.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className={`whitespace-pre ${
                  line.text.includes('[OK]') ? 'text-red-500' :
                  line.text.includes('[ACTIVE]') ? 'text-red-400' :
                  line.text.includes('██') || line.text.includes('╗') || line.text.includes('╝') || line.text.includes('╚') || line.text.includes('╔') || line.text.includes('║') ? 'text-red-500 font-bold' :
                  line.text.includes('C L U B') ? 'text-white font-bold tracking-[0.5em] text-center' :
                  line.text.includes('Press any') ? 'text-red-400/70 animate-pulse' :
                  'text-red-200/80'
                }`}
              >
                {line.text || '\u00A0'}
              </motion.div>
            ))}
            {visibleLines < bootLines.length && (
              <span className="inline-block w-2 h-4 bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
        {showSkip && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onComplete}
            className="mt-4 w-full text-center text-xs font-mono text-red-500/40 hover:text-red-500/80 transition-colors"
          >
            [ click anywhere or press any key to skip ]
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────
// ANIMATED SECTION WRAPPER
// ─────────────────────────────────────────────────
function Section({ children, className = '', id = '' }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ─────────────────────────────────────────────────
// FLOATING TERMINAL WINDOWS (background decoration)
// ─────────────────────────────────────────────────
function FloatingTerminals() {
  const terminals = [
    {
      title: 'agent.log',
      lines: ['2:00 Agent starting', '2:04 Performing task..', '2:00 task completed successfully', '2:03 idle_', '2:04 Running action()...', '2:00 Action completed'],
      style: 'top-[10%] left-[3%] w-56 rotate-[-2deg]',
    },
    {
      title: 'crontab',
      lines: ['+ + + + 0  /usr/bin/backup.sh', '+ + 8 + 0  /usr/bin/cleanup.py', '+ + 6 + 5  /usr/bin/script_sh', '+ + 5 + 3  /usr/bin/check_disk.sh'],
      style: 'top-[5%] left-[35%] w-64 rotate-[1deg]',
    },
    {
      title: 'deploy.py',
      lines: ['import os', 'def execute_task():', '  os.system("echo Running...")', '  path = "/tmp/.claw"', '  python automate.py', '  ) sudo service start'],
      style: 'top-[8%] right-[3%] w-56 rotate-[2deg]',
    },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]">
      {terminals.map((t, i) => (
        <motion.div
          key={i}
          className={`absolute ${t.style}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.3, duration: 1 }}
        >
          <div className="terminal-window p-0 text-[9px] font-mono">
            <div className="terminal-header !py-1">
              <div className="terminal-dot !w-[5px] !h-[5px] bg-red-500/60" />
              <div className="terminal-dot !w-[5px] !h-[5px] bg-red-900/40" />
              <div className="terminal-dot !w-[5px] !h-[5px] bg-red-900/40" />
              <span className="ml-1 text-[7px] text-red-500/40">{t.title}</span>
            </div>
            <div className="p-2 text-red-500/50 space-y-0.5">
              {t.lines.map((l, j) => <div key={j}>{l}</div>)}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────
// RED PARTICLES BACKGROUND
// ─────────────────────────────────────────────────
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-red-500/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────
// STAT COUNTER ANIMATION
// ─────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const step = Math.ceil(target / 40)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, 30)
    return () => clearInterval(timer)
  }, [isInView, target])

  return <span ref={ref}>{count}{suffix}</span>
}

// ─────────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      className="border border-red-500/20 rounded-lg overflow-hidden bg-red-500/[0.02] hover:border-red-500/40 transition-colors"
      whileHover={{ scale: 1.005 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-mono text-sm text-white/90">{q}</span>
        <ChevronDown className={`h-4 w-4 text-red-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 text-sm text-white/65 font-mono leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────
// WALKTHROUGH DEMO (animated "video")
// ─────────────────────────────────────────────────
type WalkthroughStep = {
  title: string
  icon: React.ElementType
  duration: number
  lines: { text: string; color?: string; delay: number }[]
  result?: { label: string; value: string; color?: string }[]
  progress?: boolean
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    title: 'STEP 1 — Choose Your Plan',
    icon: Flame,
    duration: 3500,
    lines: [
      { text: '$ claw init --subscribe', delay: 0 },
      { text: '', delay: 300 },
      { text: '  Available plans:', delay: 500 },
      { text: '    [1] Monthly — $35/mo, cancel anytime', delay: 800 },
      { text: '    [2] Yearly  — $320/yr, save $100 (Best Value)', delay: 1000 },
      { text: '', delay: 1300 },
      { text: '  > Selected: [2] Yearly Plan', delay: 1600, color: 'text-red-400' },
      { text: '  ✓ Plan locked in. Proceeding...', delay: 2200, color: 'text-red-500' },
    ],
  },
  {
    title: 'STEP 2 — Configure AI Provider',
    icon: Cpu,
    duration: 4500,
    lines: [
      { text: '$ claw config --provider', delay: 0 },
      { text: '', delay: 300 },
      { text: '  25+ providers available:', delay: 500 },
      { text: '    [1] Anthropic Claude (Recommended)', delay: 700 },
      { text: '    [2] OpenAI GPT / Codex', delay: 900 },
      { text: '    [3] Google Gemini / Vertex AI', delay: 1050 },
      { text: '    [4] xAI Grok / Groq / Mistral / DeepSeek', delay: 1200 },
      { text: '    [5] OpenRouter — 300+ models', delay: 1350 },
      { text: '', delay: 1500 },
      { text: '  > Provider: Anthropic Claude', delay: 1800, color: 'text-red-400' },
      { text: '  > Model: claude-sonnet-4-5-20250929', delay: 2200, color: 'text-red-400' },
      { text: '  > API Key: sk-ant-••••••••••••••••', delay: 2600, color: 'text-white/40' },
      { text: '  ✓ Provider configured. Key encrypted.', delay: 3200, color: 'text-red-500' },
    ],
  },
  {
    title: 'STEP 3 — Select Channels',
    icon: MessageCircle,
    duration: 4000,
    lines: [
      { text: '$ claw channels --add', delay: 0 },
      { text: '', delay: 300 },
      { text: '  Available channels:', delay: 500 },
      { text: '    [✓] Discord — Bot token ready', delay: 800, color: 'text-red-400' },
      { text: '    [✓] Telegram — Bot API connected', delay: 1100, color: 'text-red-400' },
      { text: '', delay: 1900 },
      { text: '  ✓ 2 channels configured.', delay: 2300, color: 'text-red-500' },
    ],
  },
  {
    title: 'STEP 4 — Deploy Agent',
    icon: Zap,
    duration: 6000,
    progress: true,
    lines: [
      { text: '$ claw deploy --production', delay: 0 },
      { text: '', delay: 300 },
      { text: '  Provisioning isolated container...', delay: 500 },
      { text: '  [████░░░░░░░░░░░░░░░░] 20%  Pulling image', delay: 1000 },
      { text: '  [████████░░░░░░░░░░░░] 40%  Installing runtime', delay: 1800 },
      { text: '  [████████████░░░░░░░░] 60%  Configuring gateway', delay: 2600 },
      { text: '  [████████████████░░░░] 80%  Setting up channels', delay: 3400 },
      { text: '  [████████████████████] 100% Writing config', delay: 4200 },
      { text: '', delay: 4600 },
      { text: '  ✓ Agent deployed successfully!', delay: 4800, color: 'text-red-500 font-bold' },
    ],
    result: [
      { label: 'Agent ID', value: 'SENTINEL-48', color: 'text-red-400' },
      { label: 'Gateway', value: 'https://s48.clawclub.io', color: 'text-white/60' },
      { label: 'Status', value: 'ONLINE', color: 'text-red-500' },
      { label: 'Deploy Time', value: '4m 12s', color: 'text-white/60' },
    ],
  },
]

function WalkthroughDemo() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [visibleLines, setVisibleLines] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const playStep = useCallback((stepIndex: number) => {
    clearTimers()
    setVisibleLines(0)
    setShowResult(false)
    setCurrentStep(stepIndex)

    const step = walkthroughSteps[stepIndex]
    if (!step) return

    step.lines.forEach((line, i) => {
      const t = setTimeout(() => setVisibleLines(i + 1), line.delay)
      timersRef.current.push(t)
    })

    if (step.result) {
      const t = setTimeout(() => setShowResult(true), step.duration - 800)
      timersRef.current.push(t)
    }

    const nextTimer = setTimeout(() => {
      if (stepIndex < walkthroughSteps.length - 1) {
        playStep(stepIndex + 1)
      } else {
        setIsComplete(true)
        setIsPlaying(false)
      }
    }, step.duration)
    timersRef.current.push(nextTimer)
  }, [clearTimers])

  const handlePlay = useCallback(() => {
    setIsPlaying(true)
    setIsComplete(false)
    playStep(0)
  }, [playStep])

  const handleRestart = useCallback(() => {
    clearTimers()
    setIsPlaying(true)
    setIsComplete(false)
    setCurrentStep(0)
    setVisibleLines(0)
    setShowResult(false)
    playStep(0)
  }, [clearTimers, playStep])

  const handlePause = useCallback(() => {
    clearTimers()
    setIsPlaying(false)
  }, [clearTimers])

  useEffect(() => {
    return () => clearTimers()
  }, [clearTimers])

  const step = walkthroughSteps[currentStep]
  const StepIcon = step?.icon || Terminal

  return (
    <div className="relative rounded-xl border border-red-500/20 bg-[#080808] overflow-hidden">
      {/* Top bar — step indicators */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {walkthroughSteps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  i < currentStep ? 'bg-red-500' :
                  i === currentStep && isPlaying ? 'bg-red-500 animate-pulse shadow-[0_0_6px_rgba(220,38,38,0.6)]' :
                  i === currentStep && isComplete ? 'bg-red-500' :
                  'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono text-white/40 ml-2 hidden sm:inline">
            {isPlaying ? `Step ${currentStep + 1} of ${walkthroughSteps.length}` : isComplete ? 'Complete' : 'Ready'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono text-red-500/60">RECORDING</span>
            </motion.div>
          )}
          <span className="text-[9px] font-mono text-white/35">claw-walkthrough</span>
        </div>
      </div>

      {/* Main terminal area */}
      <div className="relative" style={{ minHeight: '400px' }}>
        {/* Idle state — play button */}
        {!isPlaying && !isComplete && currentStep === 0 && visibleLines === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] via-transparent to-transparent" />
            <motion.button
              onClick={handlePlay}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative group"
            >
              <div className="w-20 h-20 rounded-full bg-red-600/90 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,0.3)] group-hover:shadow-[0_0_60px_rgba(220,38,38,0.5)] transition-shadow">
                <Play className="h-8 w-8 text-white ml-1" />
              </div>
            </motion.button>
            <p className="mt-4 text-xs font-mono text-white/50">Click to start the walkthrough</p>
            <p className="mt-1 text-[10px] font-mono text-white/35">4 steps — Full deploy demo</p>
          </div>
        )}

        {/* Terminal content */}
        <div ref={containerRef} className="p-4 sm:p-6 font-mono text-xs sm:text-sm">
          {/* Step header */}
          {(isPlaying || visibleLines > 0 || isComplete) && (
            <motion.div
              key={`header-${currentStep}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-4 pb-3 border-b border-red-500/10"
            >
              <StepIcon className="h-4 w-4 text-red-500" />
              <span className="text-red-500/80 text-xs uppercase tracking-wider">{step?.title}</span>
            </motion.div>
          )}

          {/* Lines */}
          <div className="space-y-0.5 min-h-[250px]">
            <AnimatePresence mode="wait">
              {(isPlaying || visibleLines > 0 || isComplete) && (
                <motion.div
                  key={`step-${currentStep}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {step?.lines.slice(0, visibleLines).map((line, i) => (
                    <motion.div
                      key={`${currentStep}-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12 }}
                      className={`leading-relaxed ${
                        line.color || (
                          line.text.startsWith('$') ? 'text-white/80' :
                          line.text.includes('[████') ? 'text-red-500/70' :
                          line.text.includes('✓') ? 'text-red-500' :
                          line.text.includes('>') && !line.text.startsWith('  >') ? 'text-white/70' :
                          line.text.startsWith('  >') ? 'text-red-400' :
                          'text-white/55'
                        )
                      }`}
                    >
                      {line.text || '\u00A0'}
                    </motion.div>
                  ))}

                  {/* Blinking cursor */}
                  {isPlaying && visibleLines < (step?.lines.length || 0) && (
                    <span className="inline-block w-2 h-4 bg-red-500 animate-pulse mt-1" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Deploy result cards */}
            <AnimatePresence>
              {showResult && step?.result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2"
                >
                  {step.result.map((r, i) => (
                    <motion.div
                      key={r.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      className="rounded-lg border border-red-500/15 bg-red-500/[0.03] p-3"
                    >
                      <div className="text-[9px] text-white/45 uppercase tracking-wider">{r.label}</div>
                      <div className={`text-sm font-bold mt-1 ${r.color || 'text-white/70'}`}>{r.value}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Complete state overlay */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#080808]/80 backdrop-blur-sm z-10"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Walkthrough Complete</h3>
                <p className="text-xs font-mono text-white/55 mb-6 max-w-xs">
                  That{"'"}s it. 4 steps, under 5 minutes. Your AI agent is live and listening.
                </p>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-mono"
                  >
                    <RotateCcw className="h-3 w-3" /> Replay
                  </button>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                  >
                    Deploy Yours <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-red-500/10 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button onClick={handlePause} className="text-white/30 hover:text-red-500 transition-colors">
              <Pause className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={isComplete ? handleRestart : handlePlay} className="text-white/30 hover:text-red-500 transition-colors">
              {isComplete ? <RotateCcw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4 h-1 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-red-500/60 rounded-full"
            animate={{
              width: isComplete ? '100%' : isPlaying ? `${((currentStep + 1) / walkthroughSteps.length) * 100}%` : '0%'
            }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <span className="text-[9px] font-mono text-white/40">
          {isComplete ? 'done' : isPlaying ? `${currentStep + 1}/${walkthroughSteps.length}` : '0:00'}
        </span>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════
export default function Home() {
  const [introComplete, setIntroComplete] = useState(false)
  const { scrollYProgress } = useScroll()
  const bgOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])

  const features = [
    { icon: Zap, title: 'One-Click Deploy', desc: 'Your private AI agent spins up in under 5 minutes. No terminals. No DevOps. Just click.' },
    { icon: Shield, title: 'Vault-Grade Security', desc: 'Every agent runs in an isolated container. Keys are encrypted. Nothing leaks.' },
    { icon: MessageSquare, title: 'Multi-Channel', desc: 'Connect Discord and Telegram. One agent, all your channels.' },
    { icon: Cpu, title: 'Multi-Model AI', desc: 'Bring your own API key — 25+ providers including Claude, GPT, Gemini, Grok, DeepSeek, Mistral, Ollama, and OpenRouter.' },
    { icon: Globe, title: 'Web Search & Browser', desc: 'Your agent can search the web, browse pages, and pull live data autonomously.' },
  ]

  const [activeAgents, setActiveAgents] = useState<{ name: string; status: string; uptime: string; channel: string }[]>([])
  const [agentCount, setAgentCount] = useState(0)

  useEffect(() => {
    fetch('/api/public/agents')
      .then(res => res.json())
      .then(data => {
        if (data.agents?.length > 0) {
          setActiveAgents(data.agents)
          setAgentCount(data.total)
        }
      })
      .catch(() => {})
  }, [])

  const teamMembers = [
    { 
      name: 'NickPlaysCrypto', 
      role: 'Founder & Visionary', 
      desc: 'Founder shaping the vision and growth of the autonomous agent deployment ecosystem.' 
    },
    { 
      name: 'Mirac', 
      role: 'Core Dev', 
      desc: 'Built the infrastructure from scratch. Engineer focused on architecture, deployment automation, and reliability.' 
    }, 
    { 
      name: 'Crabby', 
      role: 'Autonomous Community Agent', 
      desc: 'AI-powered onboarding and support agent managing Discord operations and developer assistance 24/7.' 
    },
  ]
  

  const faqs = [
    { q: '> What exactly is Claw Club?', a: 'Claw Club is a premium, members-only service that deploys private AI agents for you. You get a fully managed OpenClaw instance connected to your channels — Discord and Telegram.' },
    { q: '> Do I need any technical knowledge?', a: 'Zero. We handle all the infrastructure. Choose your plan, pick an AI provider, configure your channels, and we deploy everything. Four steps, under 5 minutes.' },
    { q: '> What AI models can I use?', a: 'We support 25+ providers and 150+ models: Anthropic Claude, OpenAI GPT, Google Gemini, xAI Grok, Groq, Mistral, DeepSeek, Cerebras, Venice, Ollama (local), Amazon Bedrock, and OpenRouter (300+ models). Bring your own API key and swap models anytime.' },
    { q: '> Is my data private?', a: 'Absolutely. Each member runs in a fully isolated container with encrypted keys. We never see or store your API keys or conversations.' },
    { q: '> Can I cancel anytime?', a: 'Yes. Cancel from your dashboard — no questions, no lock-in. We also offer a 7-day money-back guarantee.' },
    { q: '> What channels are supported?', a: 'Discord and Telegram. Connect multiple channels to the same agent simultaneously.' },
    { q: '> Any hidden fees?', a: 'None from us. Your only other cost is your AI provider API key (billed directly by them). Our pricing is flat and transparent.' },
  ]

  return (
    <div className="min-h-screen bg-[#050505]" style={{ backgroundColor: '#050505' }}>
      <AnimatePresence mode="wait">
        {!introComplete && (
          <IntroSequence onComplete={() => setIntroComplete(true)} />
        )}
      </AnimatePresence>

      {introComplete && (
        <div
          className="min-h-screen bg-[#050505] text-white scanlines noise vignette crt-flicker overflow-x-hidden"
          style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
        >
          <Particles />

          {/* ═══════════════════════════════════════
              HERO SECTION
              ═══════════════════════════════════════ */}
          <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <FloatingTerminals />

            {/* Giant red glow behind the claw */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-red-500/15 blur-[80px]" />

            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
              {/* Claw Club Logo */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex justify-center mb-8"
              >
                <div className="relative glow-pulse">
                  <Image
                    src="/openclaw_icon.png"
                    alt="Claw Club"
                    width={140}
                    height={140}
                    className="drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                    priority
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-mono uppercase tracking-[0.3em] mb-6"
              >
                <Flame className="h-3 w-3" /> Members-Only Access
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight"
              >
                <span className="text-white">CLAW</span>
                <span className="text-red-500 animate-text-glow"> CLUB</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-6 text-lg sm:text-xl text-white/70 font-mono max-w-xl mx-auto"
              >
                Deploy your own private AI agent in minutes.
                Powered by Claw Club. Running 24/7. Bring your keys, your rules.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  href="/register"
                  className="group relative inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-lg font-semibold text-base transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.5)]"
                >
                  Claim Your Spot <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 border border-red-500/30 text-red-400 hover:text-white hover:border-red-500/60 px-8 py-3.5 rounded-lg font-semibold text-base transition-all duration-300"
                >
                  View Plans
                </a>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="mt-16"
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-red-500 font-mono">{"<"}5 min</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1 font-mono">Deploy Time</div>
                </div>
              </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChevronDown className="h-6 w-6 text-red-500/40" />
            </motion.div>
          </section>

          {/* Red line divider */}
          <div className="red-line" />

          {/* ═══════════════════════════════════════
              PRICING — FOMO SECTION
              ═══════════════════════════════════════ */}
          <Section id="pricing" className="py-20 sm:py-28 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                  <Flame className="h-3 w-3" /> Limited Spots Available
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">
                  Lock In Your <span className="text-red-500">Price</span>
                </h2>
                <p className="mt-4 text-white/60 font-mono text-sm max-w-lg mx-auto">
                  Once we hit capacity, new members go on the waitlist.
                  Early birds keep their rate — forever.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {[
                  { name: 'Monthly', price: '$35', period: '/mo', desc: 'Try it out. Cancel anytime.', features: ['All features', 'Telegram + Discord', 'Unlimited messages', 'Web search & browser', 'Community access'] },
                  { name: 'Yearly', price: '$320', period: '/yr', desc: 'Best value. Save $100.', badge: 'BEST VALUE', popular: true, features: ['Everything in Monthly', 'Priority support', 'Dedicated support channel', 'Save $100 annually', 'Founding member perks'] },
                ].map((plan, i) => (
                  <motion.div
                    key={plan.name}
                    whileHover={{ y: -4, borderColor: 'rgba(220, 38, 38, 0.6)' }}
                    className={`relative rounded-xl border ${
                      plan.popular ? 'border-red-500/50 bg-red-500/[0.04]' : 'border-red-500/15 bg-white/[0.02]'
                    } p-6 transition-all duration-300`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-red-600 text-white text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {plan.badge}
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-mono text-red-500/60 uppercase tracking-wider">{plan.name}</div>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-sm text-white/50 font-mono mb-1">{plan.period}</span>
                    </div>
                    <p className="mt-2 text-xs text-white/55 font-mono">{plan.desc}</p>
                    <div className="mt-6 space-y-2.5">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-sm text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="font-mono text-xs">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/register"
                      className={`mt-6 block w-full text-center py-2.5 rounded-lg text-sm font-semibold font-mono transition-all duration-300 ${
                        i === 1
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                          : 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      Get Started
                    </Link>
                  </motion.div>
                ))}
              </div>

            </div>
          </Section>

          <div className="red-line" />


          {/* ═══════════════════════════════════════
              FEATURES
              ═══════════════════════════════════════ */}
          <Section className="py-20 sm:py-28 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                  <Terminal className="h-3 w-3" /> Capabilities
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">
                  What Your <span className="text-red-500">Agent</span> Can Do
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    whileHover={{ borderColor: 'rgba(220, 38, 38, 0.5)', y: -2 }}
                    className="group rounded-xl border border-red-500/10 bg-white/[0.02] p-6 transition-all duration-300 hover:bg-red-500/[0.03]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-shadow">
                      <f.icon className="h-5 w-5 text-red-500" />
                    </div>
                    <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                    <p className="text-sm text-white/60 font-mono leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Section>

          <div className="red-line" />

          {/* ═══════════════════════════════════════
              ACTIVE AGENTS (only shown when real agents exist)
              ═══════════════════════════════════════ */}
          {activeAgents.length > 0 && (
            <>
            <Section className="py-20 sm:py-28 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-14">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                    <Activity className="h-3 w-3" /> Live Network
                  </div>
                  <h2 className="text-4xl sm:text-5xl font-bold">
                    {agentCount} Active <span className="text-red-500">{agentCount === 1 ? 'Agent' : 'Agents'}</span>
                  </h2>
                  <p className="mt-4 text-white/60 font-mono text-sm">Real agents. Real uptime. Running right now.</p>
                </div>

                <div className="terminal-window p-0 overflow-hidden">
                  <div className="terminal-header">
                    <div className="terminal-dot bg-red-500" />
                    <div className="terminal-dot bg-red-900/50" />
                    <div className="terminal-dot bg-red-900/50" />
                    <span className="ml-2 text-[10px] font-mono text-red-500/50 uppercase tracking-wider">agent-monitor</span>
                  </div>
                  <div className="p-1">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-red-500/50 uppercase tracking-wider">
                          <th className="text-left p-3">Agent</th>
                          <th className="text-left p-3 hidden sm:table-cell">Status</th>
                          <th className="text-left p-3 hidden md:table-cell">Uptime</th>
                          <th className="text-left p-3 hidden sm:table-cell">Channel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeAgents.map((agent, i) => (
                          <motion.tr
                            key={agent.name}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="border-t border-red-500/10 hover:bg-red-500/[0.03] transition-colors"
                          >
                            <td className="p-3 text-white/80">{agent.name}</td>
                            <td className="p-3 hidden sm:table-cell">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${agent.status === 'online' ? 'bg-red-500 shadow-[0_0_6px_rgba(220,38,38,0.6)]' : 'bg-yellow-500/60'}`} />
                                <span className={agent.status === 'online' ? 'text-red-400' : 'text-yellow-400/60'}>{agent.status}</span>
                              </span>
                            </td>
                            <td className="p-3 text-white/60 hidden md:table-cell">{agent.uptime}</td>
                            <td className="p-3 text-white/60 hidden sm:table-cell">{agent.channel}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-red-500/10 flex items-center justify-between text-[10px] font-mono text-red-500/40">
                    <span>{agentCount} agent{agentCount !== 1 ? 's' : ''} active</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>
              </div>
            </Section>

            <div className="red-line" />
            </>
          )}

          {/* ═══════════════════════════════════════
              KEY HUMAN MEMBERS
              ═══════════════════════════════════════ */}
          <Section className="py-20 sm:py-28 px-6">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                  <Crown className="h-3 w-3" /> The Team
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">
                  Key <span className="text-red-500">Members</span>
                </h2>
                <p className="mt-4 text-white/60 font-mono text-sm">The humans behind the claws.</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                {teamMembers.map((m, i) => (
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ borderColor: 'rgba(220, 38, 38, 0.5)' }}
                    className="rounded-xl border border-red-500/10 bg-white/[0.02] p-5 text-center transition-all duration-300"
                  >
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-red-500 font-bold font-mono text-lg">{m.name[0]}</span>
                    </div>
                    <div className="font-semibold text-white/90 mb-1">{m.name}</div>
                    <div className="text-[10px] font-mono text-red-500/60 uppercase tracking-wider mb-3">{m.role}</div>
                    <p className="text-xs text-white/55 font-mono leading-relaxed">{m.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </Section>

          <div className="red-line" />


          {/* ═══════════════════════════════════════
              WALKTHROUGH DEMO
              ═══════════════════════════════════════ */}
          <Section className="py-20 sm:py-28 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                  <Play className="h-3 w-3" /> See It In Action
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">
                  What{"'"}s <span className="text-red-500">On Offer</span>
                </h2>
                <p className="mt-4 text-white/60 font-mono text-sm">Watch a full deploy walkthrough — from plan selection to live agent.</p>
              </div>

              <WalkthroughDemo />
            </div>
          </Section>

          <div className="red-line" />

          {/* ═══════════════════════════════════════
              FAQ
              ═══════════════════════════════════════ */}
          <Section className="py-20 sm:py-28 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">
                  <Terminal className="h-3 w-3" /> FAQ
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">
                  Questions<span className="text-red-500">?</span>
                </h2>
              </div>

              <div className="space-y-3">
                {faqs.map((faq) => (
                  <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </div>
          </Section>

          <div className="red-line" />

          {/* ═══════════════════════════════════════
              FINAL CTA — NUDGE
              ═══════════════════════════════════════ */}
          <Section className="py-20 sm:py-28 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/[0.08] via-red-500/[0.02] to-transparent p-8 sm:p-12 text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-red-500/10 blur-[100px]" />

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    className="flex justify-center mb-6"
                  >
                    <Image
                      src="/openclaw_icon.png"
                      alt="Claw Club"
                      width={80}
                      height={80}
                      className="drop-shadow-[0_0_20px_rgba(220,38,38,0.4)] glow-pulse"
                    />
                  </motion.div>

                  <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                    Stop Watching.<br />
                    <span className="text-red-500">Start Deploying.</span>
                  </h2>
                  <p className="text-white/60 font-mono text-sm max-w-md mx-auto mb-8">
                    Your private AI agent is one click away. Join Claw Club,
                    deploy your agent, and never look back.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/register"
                      className="group inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-8 py-3.5 rounded-lg font-semibold transition-all duration-300 shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.5)]"
                    >
                      Claim Your Spot Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <a
                      href="https://clawclub.cc" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-red-500/30 text-red-400 hover:text-white hover:border-red-500/60 px-8 py-3.5 rounded-lg font-semibold transition-all duration-300"
                    >
                      Join Discord <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-mono text-white/45">
                    <Lock className="h-3 w-3" />
                    Secure checkout • Cancel anytime
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ═══════════════════════════════════════
              FOOTER
              ═══════════════════════════════════════ */}
          <footer className="border-t border-red-500/20 py-12 bg-[#080808]/50">
            <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Image src="/openclaw_icon.png" alt="Claw Club" width={28} height={28} className="opacity-70" />
                <span className="text-sm font-mono text-white/70">&copy; 2026 Claw Club. All rights reserved.</span>
              </div>
              <div className="flex items-center gap-6 text-sm font-mono text-white/70">
                <Link href="/login" className="hover:text-red-400 transition-colors">Login</Link>
                <Link href="/register" className="hover:text-red-400 transition-colors">Register</Link>
                <Link href="/pricing" className="hover:text-red-400 transition-colors">Pricing</Link>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
