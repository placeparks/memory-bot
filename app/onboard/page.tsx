'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Shield, ArrowRight, ArrowLeft, Flame, Terminal, Cpu, MessageSquare, Zap } from 'lucide-react'
import PlanSelection from '@/components/forms/plan-selection'
import ProviderConfig from '@/components/forms/provider-config'
import ChannelSelector from '../../components/forms/channel-selector'
import SkillsConfig from '@/components/forms/skills-config'

const steps = [
  { id: 1, name: 'Choose Plan', description: 'Select your subscription', icon: Flame },
  { id: 2, name: 'AI Provider', description: 'Configure your AI model', icon: Cpu },
  { id: 3, name: 'Channels', description: 'Select messaging platforms', icon: MessageSquare },
  { id: 4, name: 'Skills', description: 'Enable features (optional)', icon: Zap },
]

type ChannelConfig = { type: string; config: Record<string, any> }

type OnboardConfig = {
  templateId: string
  plan: string
  provider: string
  apiKey: string
  model: string
  channels: ChannelConfig[]
  webSearchEnabled: boolean
  braveApiKey: string
  browserEnabled: boolean
  ttsEnabled: boolean
  elevenlabsApiKey: string
  canvasEnabled: boolean
  cronEnabled: boolean
  memoryEnabled: boolean
}

// Floating particles background
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-red-500/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.15, 0.4, 0.15],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 5 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// Step transition variants
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
    scale: 0.98,
  }),
}

export default function OnboardPage() {
  const router = useRouter()
  const { status } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  const [config, setConfig] = useState<OnboardConfig>({
    templateId: '',
    plan: 'MONTHLY',
    provider: 'ANTHROPIC',
    apiKey: '',
    model: '',
    channels: [],
    webSearchEnabled: false,
    braveApiKey: '',
    browserEnabled: false,
    ttsEnabled: false,
    elevenlabsApiKey: '',
    canvasEnabled: false,
    cronEnabled: false,
    memoryEnabled: false,
  })

  const providerLabel =
    config.provider === 'OPENAI'
      ? 'OpenAI GPT'
      : config.provider === 'ANTHROPIC'
      ? 'Anthropic Claude'
      : config.provider

  const updateConfig = (updates: any) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setDirection(1)
      setCurrentStep(currentStep + 1)
    } else {
      handleCheckout()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: config.plan, config })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        alert(`Checkout failed: ${data.error || 'Unknown error'}`)
        return
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      alert('Failed to initialize checkout')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const StepIcon = steps[currentStep - 1].icon

  return (
    <div
      className="min-h-screen bg-[#050505] text-white py-12 scanlines noise"
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <Particles />

      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-red-600/10 blur-[100px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-red-500/8 blur-[100px]"
          animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-red-500/[0.03] blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Flame className="h-3 w-3" /> onboarding
          </motion.div>
          <motion.h1
            className="mt-6 text-3xl sm:text-4xl md:text-5xl font-bold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Build your <span className="text-red-500 animate-text-glow">Claw Club</span> agent
          </motion.h1>
          <motion.p
            className="mt-3 text-white/40 font-mono text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Four steps. Clear choices. We handle the deploy.
          </motion.p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          className="mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="flex gap-4 overflow-x-auto pb-2 sm:overflow-visible sm:flex-wrap sm:justify-between sm:items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center shrink-0 sm:shrink">
                <div className="flex flex-col items-center min-w-[120px] sm:min-w-0">
                  <motion.div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold font-mono transition-all duration-500 ${
                      currentStep > step.id
                        ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                        : currentStep === step.id
                        ? 'bg-red-500/10 text-red-500 border border-red-500/40 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                        : 'bg-white/5 text-white/25 border border-white/10'
                    }`}
                    animate={currentStep === step.id ? {
                      boxShadow: ['0 0 15px rgba(220,38,38,0.2)', '0 0 25px rgba(220,38,38,0.4)', '0 0 15px rgba(220,38,38,0.2)'],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {currentStep > step.id ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                      </motion.div>
                    ) : (
                      step.id
                    )}
                  </motion.div>
                  <div className="mt-2 text-center">
                    <p className={`font-semibold text-xs sm:text-sm transition-colors duration-300 ${
                      currentStep === step.id ? 'text-red-400' : currentStep > step.id ? 'text-white/60' : 'text-white/30'
                    }`}>{step.name}</p>
                    <p className="hidden sm:block text-[10px] text-white/40 font-mono">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden sm:block h-1 flex-1 mx-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-red-600"
                      initial={{ width: '0%' }}
                      animate={{ width: currentStep > step.id ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.45fr] items-start">
          {/* Step Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <Card className="border border-red-500/15 bg-white/[0.02] text-white shadow-[0_0_60px_rgba(0,0,0,0.4)] overflow-hidden">
              {/* Terminal-style header bar */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-red-500/10 bg-[#0a0a0a]/50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
                <span className="ml-2 text-[9px] font-mono text-red-500/50 uppercase tracking-wider flex items-center gap-1.5">
                  <StepIcon className="h-3 w-3" />
                  step {currentStep} — {steps[currentStep - 1].name}
                </span>
                <span className="ml-auto text-[10px] font-mono text-white/30">
                  {currentStep}/{steps.length}
                </span>
              </div>

              <CardHeader>
                <CardTitle className="text-xl">{steps[currentStep - 1].name}</CardTitle>
                <CardDescription className="text-white/60 font-mono text-xs">{steps[currentStep - 1].description}</CardDescription>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  >
                    {currentStep === 1 && (
                      <PlanSelection
                        selectedPlan={config.plan}
                        onSelect={(plan) => updateConfig({ plan })}
                      />
                    )}
                    {currentStep === 2 && (
                      <ProviderConfig
                        config={config}
                        onChange={updateConfig}
                      />
                    )}
                    {currentStep === 3 && (
                      <ChannelSelector
                        channels={config.channels}
                        onChange={(channels) => updateConfig({ channels })}
                      />
                    )}
                    {currentStep === 4 && (
                      <SkillsConfig
                        config={config}
                        onChange={updateConfig}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <Card className="border border-red-500/15 bg-white/[0.02] text-white shadow-[0_0_40px_rgba(0,0,0,0.3)] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]/50">
                <div className="w-2 h-2 rounded-full bg-red-500/60" />
                <span className="text-[9px] font-mono text-red-500/40 uppercase tracking-wider">summary</span>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Setup summary</CardTitle>
                <CardDescription className="text-white/50 font-mono text-xs">Quick glance before checkout.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  { label: 'Plan', value: config.plan, always: true },
                  { label: 'Provider', value: currentStep >= 2 ? providerLabel : 'Step 2', always: true },
                  { label: 'Channels', value: currentStep >= 3 ? `${config.channels.length || 0} selected` : 'Step 3', always: true },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                  >
                    <span className="text-white/50 font-mono text-xs">{item.label}</span>
                    <span className="font-semibold text-sm capitalize">{item.value}</span>
                  </motion.div>
                ))}

                {/* Progress indicator */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/40 font-mono">Progress</span>
                    <span className="text-[10px] text-red-500/60 font-mono">{Math.round((currentStep / steps.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500"
                      animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/10 bg-white/[0.02] px-3 py-2 text-[10px] text-white/40 font-mono">
                  Your deployment starts after payment and completes in a few minutes.
                </div>
              </CardContent>
            </Card>

            <motion.div
              className="rounded-xl border border-red-500/10 bg-white/[0.02] p-4 text-xs text-white/30 font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500/50" />
                Your keys never leave your private instance.
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Navigation */}
        <motion.div
          className="mt-10 flex flex-wrap items-center justify-between gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="w-full sm:w-auto border-red-500/30 text-red-500 hover:border-red-500/60 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="order-last w-full sm:order-none sm:w-auto flex items-center gap-3 text-[10px] text-white/40 font-mono">
            <Shield className="h-4 w-4 text-red-500/40" />
            Secure checkout. Cancel any time.
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto"
          >
            <Button
              onClick={nextStep}
              disabled={loading}
              className="w-full sm:w-auto bg-red-600 text-white hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_35px_rgba(220,38,38,0.4)] transition-all duration-300"
            >
              {loading ? (
                <motion.span
                  className="flex items-center gap-2"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Processing...
                </motion.span>
              ) : (
                <>
                  {currentStep === steps.length ? 'Proceed to Payment' : 'Next Step'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
