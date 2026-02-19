'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shield, Sparkles, ArrowRight, Terminal, Lock, Mail, KeyRound } from 'lucide-react'

const terminalLines = [
  '> claw auth --login',
  '> Verifying credentials...',
  '  [OK] Session encrypted',
  '  [OK] Gateway standby',
  '> Awaiting input...',
]

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    terminalLines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 300 + i * 400))
    })
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6 scanlines noise"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-600/8 blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-red-500/5 blur-[100px]" />
        <div className="absolute top-0 right-0 w-[250px] h-[250px] rounded-full bg-red-500/5 blur-[100px]" />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-red-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.1, 0.4, 0.1],
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

      <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center gap-12">
        {/* Left side — terminal decoration (hidden on mobile) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:block flex-1"
        >
          <div className="terminal-window p-0 overflow-hidden">
            <div className="terminal-header">
              <div className="terminal-dot bg-red-500" />
              <div className="terminal-dot bg-red-900/50" />
              <div className="terminal-dot bg-red-900/50" />
              <span className="ml-2 text-[10px] font-mono text-red-500/60 uppercase tracking-wider">
                auth-session
              </span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed min-h-[200px]">
              {terminalLines.slice(0, visibleLines).map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`${
                    line.includes('[OK]') ? 'text-red-500' :
                    line.startsWith('>') ? 'text-red-200/80' :
                    'text-white/40'
                  }`}
                >
                  {line}
                </motion.div>
              ))}
              {visibleLines < terminalLines.length && (
                <span className="inline-block w-2 h-4 bg-red-500 animate-pulse" />
              )}
              {visibleLines >= terminalLines.length && (
                <span className="inline-block w-2 h-4 bg-red-500/50 animate-pulse mt-1" />
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-xs font-mono text-white/35">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-500/60" />
              </div>
              <span>End-to-end encrypted sessions</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-white/35">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Lock className="h-4 w-4 text-red-500/60" />
              </div>
              <span>Your API keys never leave your container</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-white/35">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Terminal className="h-4 w-4 text-red-500/60" />
              </div>
              <span>Isolated sandbox per agent</span>
            </div>
          </div>
        </motion.div>

        {/* Right side — login form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          <div className="rounded-xl border border-red-500/20 bg-[#0a0a0a]/80 backdrop-blur-sm shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-2 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mx-auto mb-4"
              >
                <Image
                  src="/openclaw_icon.png"
                  alt="Claw Club"
                  width={56}
                  height={56}
                  className="drop-shadow-[0_0_20px_rgba(220,38,38,0.4)] mx-auto"
                />
              </motion.div>
              <h1 className="text-2xl font-bold">
                Welcome back to <span className="text-red-500">Claw Club</span>
              </h1>
              <p className="text-white/40 font-mono text-xs mt-2">
                Sign in to manage your private OpenClaw gateway.
              </p>
            </div>

            {/* Form */}
            <div className="px-8 pb-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-3"
                  >
                    <p className="text-sm text-red-200 font-mono">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-white/60 font-mono flex items-center gap-2">
                    <Mail className="h-3 w-3 text-red-500/50" /> Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="border-red-500/15 bg-white/5 text-white placeholder:text-white/20 font-mono text-sm h-11 focus:border-red-500/40 focus:ring-red-500/20 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-white/60 font-mono flex items-center gap-2">
                    <KeyRound className="h-3 w-3 text-red-500/50" /> Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="border-red-500/15 bg-white/5 text-white placeholder:text-white/20 font-mono text-sm h-11 focus:border-red-500/40 focus:ring-red-500/20 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-all shadow-[0_0_25px_rgba(220,38,38,0.25)] hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] group"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>

                {/* Info box — visible on mobile only (desktop shows the left panel instead) */}
                <div className="lg:hidden grid gap-3 rounded-lg border border-red-500/10 bg-white/[0.02] p-4 text-xs text-white/35 font-mono">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-red-500/50" />
                    Tokens stay private and encrypted.
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-red-500/50" />
                    Your gateway spins up on demand.
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-red-500/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0a0a0a] px-3 text-white/25 font-mono">or</span>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <span className="text-white/35">Don&apos;t have an account? </span>
                  <Link href="/register" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
                    Sign up
                  </Link>
                </div>

                <div className="text-center">
                  <Link href="/" className="text-xs text-white/25 hover:text-red-500/70 transition-colors font-mono">
                    &larr; Back to home
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
