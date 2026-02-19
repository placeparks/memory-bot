'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send, Hash, Zap, Phone, Mail, Grid, Users, Copy, ExternalLink, QrCode, Terminal, Wifi, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'

const channelIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  TELEGRAM: Send,
  DISCORD: Hash,
  SLACK: Zap,
  SIGNAL: Phone,
  GOOGLE_CHAT: Mail,
  MATRIX: Grid,
  MSTEAMS: Users
}

interface ChannelAccessProps {
  channels: any[]
}

interface PairingRequest {
  code?: string
  userId?: string
  expires?: string
  raw?: string
}

export default function ChannelAccess({ channels }: ChannelAccessProps) {
  const [showingQR, setShowingQR] = useState<string | null>(null)
  const [pairingChannel, setPairingChannel] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState('')
  const [pairingError, setPairingError] = useState<string | null>(null)
  const [pairingSuccess, setPairingSuccess] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PairingRequest[]>([])
  const [showPendingRequests, setShowPendingRequests] = useState(false)
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [showCliCommand, setShowCliCommand] = useState(false)
  const [cliCommand, setCliCommand] = useState('')
  const [apiOutput, setApiOutput] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrData, setQrData] = useState<string | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrRaw, setQrRaw] = useState<string | null>(null)
  const [qrAsciiImage, setQrAsciiImage] = useState<string | null>(null)
  const [qrRefreshTick, setQrRefreshTick] = useState(0)
  const telegramChannel = channels?.find((c) => c.type === 'TELEGRAM')
  const telegramUsername = telegramChannel?.botUsername?.replace('@', '')
  const telegramPairLink =
    telegramUsername && pairingCode
      ? `https://t.me/${telegramUsername}?start=${encodeURIComponent(pairingCode)}`
      : '#'

  const getAccessInfo = (channel: any) => {
    switch (channel.type) {
      case 'WHATSAPP':
        return { label: 'QR Code', value: 'Click to view', action: 'qr' }
      case 'TELEGRAM':
        return {
          label: 'Bot Username',
          value: channel.botUsername || '@yourbot',
          link: channel.botUsername ? `https://t.me/${channel.botUsername.replace('@', '')}` : undefined
        }
      case 'DISCORD':
        return {
          label: 'Invite Link',
          value: channel.inviteLink || 'Generate in Discord',
          link: channel.inviteLink
        }
      default:
        return { label: 'Status', value: channel.enabled ? 'Connected' : 'Disconnected' }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const loadPendingRequests = async () => {
    setLoadingRequests(true)
    setPairingError(null)
    try {
      const response = await fetch('/api/instance/pair/list?channel=telegram')
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to load pending requests')
      setPendingRequests(result?.requests || [])
      setShowPendingRequests(true)
    } catch (error: any) {
      setPairingError(error.message || 'Failed to load pending requests')
    } finally {
      setLoadingRequests(false)
    }
  }

  const doApprovePairing = async () => {
    setPairingError(null)
    setPairingSuccess(null)
    setPairingLoading(true)
    setApiOutput('')
    setShowCliCommand(false)
    try {
      const response = await fetch('/api/instance/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: 'telegram', code: pairingCode.trim() })
      })
      const result = await response.json()
      if (response.ok) {
        if (result?.output) setApiOutput(result.output)
        if (result?.instructions) {
          setCliCommand(result.cliCommand)
          setShowCliCommand(true)
          setPairingSuccess(result?.message || 'Use the command below to approve')
        } else {
          setShowCliCommand(false)
          setPairingSuccess(result?.message || 'Pairing approved successfully!')
        }
      } else {
        setPairingError(result?.error || 'Pairing failed')
      }
    } catch (error: any) {
      setPairingError('Network error - showing manual approval method')
      setCliCommand(`openclaw pairing approve telegram ${pairingCode.trim()}`)
      setShowCliCommand(true)
    } finally {
      setPairingLoading(false)
    }
  }

  const approvePairing = () => {
    if (!pairingCode) return
    doApprovePairing()
  }

  const openQr = async (channelType: string) => {
    setShowingQR(channelType)
    setQrLoading(true)
    setQrError(null)
    setQrData(null)
    setQrImage(null)
    setQrRaw(null)
    setQrAsciiImage(null)
    if (channelType !== 'WHATSAPP') { setQrLoading(false); return }
    try {
      const response = await fetch('/api/instance/whatsapp/qr', { method: 'POST', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok || !result?.success) throw new Error(result?.error || 'Failed to generate QR')
      if (result?.qr) {
        setQrData(result.qr)
      } else if (result?.raw && result.raw.includes('▄▄') && result.raw.includes('█')) {
        setQrRaw(result.raw)
      } else {
        setQrRaw(result?.raw || '')
        throw new Error('QR data not returned. Check instance logs.')
      }
    } catch (error: any) {
      setQrError(error.message || 'Failed to generate QR')
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!qrData) return
    QRCode.toDataURL(qrData, { margin: 1, width: 360 })
      .then((url) => { if (!cancelled) setQrImage(url) })
      .catch(() => { if (!cancelled) setQrError('Failed to render QR') })
    return () => { cancelled = true }
  }, [qrData])

  useEffect(() => {
    if (!qrRaw) return
    const lines = qrRaw.split('\n').map((l) => l.replace(/\r/g, '')).filter((l) => /[█▀▄]/.test(l))
    if (lines.length === 0) return
    const width = Math.max(...lines.map((l) => l.length))
    const height = lines.length * 2
    const pixels: number[][] = Array.from({ length: height }, () => Array(width).fill(0))
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y]
      for (let x = 0; x < width; x++) {
        const ch = line[x] || ' '
        const topRow = y * 2
        const bottomRow = y * 2 + 1
        if (ch === '█') { pixels[topRow][x] = 1; pixels[bottomRow][x] = 1 }
        else if (ch === '▀') { pixels[topRow][x] = 1 }
        else if (ch === '▄') { pixels[bottomRow][x] = 1 }
      }
    }
    const targetSize = 360
    const scale = Math.max(2, Math.floor(targetSize / width))
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#050505'
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (pixels[y][x]) ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
    try { setQrAsciiImage(canvas.toDataURL('image/png')) } catch {}
  }, [qrRaw, qrRefreshTick])

  const refreshQr = () => {
    if (!showingQR) return
    setQrRefreshTick((t) => t + 1)
    openQr(showingQR)
  }

  // Modal backdrop component
  const ModalBackdrop = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )

  // No channels state
  if (!channels || channels.length === 0) {
    return (
      <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-red-500/10 bg-[#0a0a0a]/50">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <span className="ml-2 text-[9px] font-mono text-red-500/50 uppercase tracking-wider flex items-center gap-1.5">
            <Wifi className="h-3 w-3" /> channels
          </span>
        </div>
        <CardHeader>
          <CardTitle className="text-white">Channel Access</CardTitle>
          <CardDescription className="text-white/30 font-mono text-xs">No channels configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-white/40">
              Configure channels in your instance settings to start chatting with your bot.
            </p>
            <div className="rounded-lg border border-red-500/10 bg-white/[0.02] p-4 space-y-3">
              <p className="text-sm font-medium text-white/70">Pair Telegram</p>
              <input
                className="w-full border border-red-500/15 rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-red-500/40 transition-colors outline-none"
                placeholder="Enter pairing code"
                value={pairingCode}
                onChange={(e) => setPairingCode(e.target.value)}
              />
              {pairingError && <p className="text-sm text-red-400">{pairingError}</p>}
              {pairingSuccess && <p className="text-sm text-red-400">{pairingSuccess}</p>}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/20 text-white/60 hover:text-red-400 hover:border-red-500/40 transition-all"
                  onClick={() => copyToClipboard(pairingCode ? `/pair ${pairingCode}` : '/pair')}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Command
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-500/20 text-white/60 hover:text-red-400 hover:border-red-500/40 transition-all"
                  onClick={approvePairing}
                  disabled={!pairingCode || pairingLoading}
                >
                  {pairingLoading ? 'Pairing...' : 'Pair Now'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/20 font-mono">
              Pairing works without channel config, but Telegram deep links need a bot username.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-red-500/15 bg-white/[0.02] text-white overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-red-500/10 bg-[#0a0a0a]/50">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
        <span className="ml-2 text-[9px] font-mono text-red-500/50 uppercase tracking-wider flex items-center gap-1.5">
          <Wifi className="h-3 w-3" /> channel-access
        </span>
        <span className="ml-auto text-[9px] font-mono text-white/15">{channels.length} connected</span>
      </div>

      <CardContent className="pt-5">
        <div className="space-y-3">
          {channels.map((channel, index) => {
            const Icon = channelIcons[channel.type] || MessageSquare
            const accessInfo = getAccessInfo(channel)

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex flex-col gap-3 p-4 border rounded-lg transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${
                  channel.enabled
                    ? 'border-red-500/15 bg-red-500/[0.02] hover:border-red-500/30'
                    : 'border-white/5 bg-white/[0.01]'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-3 rounded-lg border ${
                    channel.enabled ? 'border-red-500/20 bg-red-500/10' : 'border-white/10 bg-white/5'
                  }`}>
                    <Icon className={`h-5 w-5 ${channel.enabled ? 'text-red-400' : 'text-white/20'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <p className="font-semibold text-white/90">{channel.type.replace('_', ' ')}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                        channel.enabled
                          ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                          : 'bg-white/5 border border-white/10 text-white/30'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${channel.enabled ? 'bg-red-500' : 'bg-white/20'}`} />
                        {channel.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 font-mono">
                      <span className="text-white/40">{accessInfo.label}:</span>{' '}
                      {accessInfo.value}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {accessInfo.action === 'qr' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 transition-all"
                      onClick={() => openQr(channel.type)}
                    >
                      <QrCode className="h-4 w-4 mr-1.5" />
                      QR
                    </Button>
                  )}
                  {accessInfo.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 transition-all"
                      asChild
                    >
                      <a href={accessInfo.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1.5" />
                        Open
                      </a>
                    </Button>
                  )}
                  {channel.type === 'TELEGRAM' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 transition-all"
                        onClick={loadPendingRequests}
                        disabled={loadingRequests}
                      >
                        {loadingRequests ? 'Loading...' : 'Pending'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 transition-all"
                        onClick={() => {
                          setPairingChannel(channel.type)
                          setPairingCode('')
                          setPairingError(null)
                          setPairingSuccess(null)
                        }}
                      >
                        Pair
                      </Button>
                    </>
                  )}
                  {accessInfo.value && accessInfo.value.startsWith('@') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-500/20 text-red-500/50 hover:text-red-400 hover:border-red-500/40 transition-all"
                      onClick={() => copyToClipboard(accessInfo.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* ═══ QR Code Modal ═══ */}
        {showingQR && (
          <ModalBackdrop onClose={() => setShowingQR(null)}>
            <Card className="max-w-md w-full border border-red-500/20 bg-[#080808] text-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-mono text-red-500/50 uppercase tracking-wider">whatsapp-qr</span>
                </div>
                <button onClick={() => setShowingQR(null)} className="text-white/20 hover:text-white/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle>WhatsApp QR Code</CardTitle>
                <CardDescription className="text-white/30 font-mono text-xs">Scan with WhatsApp to connect</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-red-500/10 bg-white/[0.02] p-4">
                  <div className="rounded-lg border border-red-500/10 bg-white/[0.03] p-3 flex items-center justify-center min-h-[280px]">
                    {qrLoading && (
                      <div className="text-center">
                        <motion.div
                          className="w-8 h-8 border-2 border-red-500/20 border-t-red-500 rounded-full mx-auto mb-3"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <p className="text-white/30 text-sm font-mono">Generating QR...</p>
                      </div>
                    )}
                    {!qrLoading && qrImage && <img src={qrImage} alt="WhatsApp QR Code" className="w-72 h-72" />}
                    {!qrLoading && !qrImage && qrAsciiImage && <img src={qrAsciiImage} alt="WhatsApp QR Code" className="w-72 h-72" />}
                    {!qrLoading && !qrImage && !qrRaw && (
                      <p className="text-white/30 text-center text-sm font-mono">QR Code not available yet.<br />Try again in a few seconds.</p>
                    )}
                    {!qrLoading && !qrImage && !qrAsciiImage && qrRaw && (
                      <pre className="w-full text-[10px] leading-[10px] text-red-500/50 font-mono whitespace-pre">{qrRaw}</pre>
                    )}
                  </div>
                  {qrError && <p className="mt-3 text-xs text-red-400 text-center">{qrError}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40"
                    onClick={refreshQr}
                    disabled={qrLoading}
                  >
                    {qrLoading ? 'Refreshing...' : 'Refresh QR'}
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 text-white hover:bg-red-500"
                    onClick={() => setShowingQR(null)}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ModalBackdrop>
        )}

        {/* ═══ Pending Requests Modal ═══ */}
        {showPendingRequests && (
          <ModalBackdrop onClose={() => setShowPendingRequests(false)}>
            <Card className="max-w-2xl w-full border border-red-500/20 bg-[#080808] text-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-mono text-red-500/50 uppercase tracking-wider">pending-requests</span>
                </div>
                <button onClick={() => setShowPendingRequests(false)} className="text-white/20 hover:text-white/50 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle>Pending Pairing Requests</CardTitle>
                <CardDescription className="text-white/30 font-mono text-xs">Approve users who have messaged your bot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-white/25 text-center py-4 font-mono">No pending pairing requests</p>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map((req, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-red-500/10 rounded-lg bg-white/[0.02]">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-500/50">
                            Code: <span className="font-mono text-red-500/50">{req.code}</span>
                          </p>
                          {req.userId && <p className="text-xs text-white/25 font-mono">User ID: {req.userId}</p>}
                          {req.expires && <p className="text-xs text-white/25 font-mono">Expires: {new Date(req.expires).toLocaleString()}</p>}
                          {req.raw && !req.code && <p className="text-xs text-white/25 font-mono">{req.raw}</p>}
                        </div>
                        <Button
                          size="sm"
                          className="bg-red-600 text-white hover:bg-red-500"
                          onClick={() => {
                            setPairingCode(req.code || '')
                            setPairingChannel('TELEGRAM')
                            setShowPendingRequests(false)
                          }}
                          disabled={!req.code}
                        >
                          Approve
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {pairingError && <p className="text-sm text-red-400">{pairingError}</p>}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/20 text-white/50 hover:text-red-400 hover:border-red-500/40"
                    onClick={loadPendingRequests}
                    disabled={loadingRequests}
                  >
                    {loadingRequests ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500/20 text-white/50 hover:text-red-400 hover:border-red-500/40"
                    onClick={() => setShowPendingRequests(false)}
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </ModalBackdrop>
        )}

        {/* ═══ Pairing Modal ═══ */}
        {pairingChannel && (
          <ModalBackdrop onClose={() => { setPairingChannel(null); setShowCliCommand(false); setCliCommand(''); setApiOutput('') }}>
            <Card className="max-w-md w-full border border-red-500/20 bg-[#080808] text-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-red-500/10 bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] font-mono text-red-500/50 uppercase tracking-wider">pair-telegram</span>
                </div>
                <button
                  onClick={() => { setPairingChannel(null); setShowCliCommand(false); setCliCommand(''); setApiOutput('') }}
                  className="text-white/20 hover:text-white/50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardHeader className="pb-3">
                <CardTitle>Pair Telegram</CardTitle>
                <CardDescription className="text-white/30 font-mono text-xs">
                  Enter the pairing code you received, then open Telegram to connect.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-white/40 mb-2">
                    If you do not have access to the bot, share this code with the bot owner.
                  </p>
                  <input
                    className="w-full border border-red-500/15 rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-red-500/40 transition-colors outline-none"
                    placeholder="Enter pairing code"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                  />
                </div>
                {showCliCommand && cliCommand && (
                  <div className="rounded-lg border border-red-500/15 bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-5 w-5 text-red-500/70" />
                      <p className="text-sm font-medium text-white/70">Run this command in Railway Terminal</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-[#050505] px-3 py-2 rounded border border-red-500/10 font-mono text-white/50">
                        {cliCommand}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/20 text-white/50 hover:text-red-400 hover:border-red-500/40"
                        onClick={() => copyToClipboard(cliCommand)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-white/30 space-y-1 font-mono">
                      <p className="font-medium text-white/40">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Open Railway Dashboard</li>
                        <li>Go to your OpenClaw service - Deployments</li>
                        <li>Click active deployment - Terminal</li>
                        <li>Paste and run the command above</li>
                      </ol>
                    </div>
                  </div>
                )}
                {pairingError && <p className="text-sm text-red-400">{pairingError}</p>}
                {pairingSuccess && <p className="text-sm text-red-400">{pairingSuccess}</p>}
                <Button
                  className="w-full bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.15)]"
                  onClick={approvePairing}
                  disabled={!pairingCode || pairingLoading}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  {pairingLoading ? 'Pairing...' : showCliCommand ? 'Retry Pairing' : 'Pair Now'}
                </Button>
                <Button
                  className="w-full bg-white/5 text-white/60 hover:bg-white/10 border border-red-500/10"
                  asChild
                  disabled={!pairingCode || !telegramUsername}
                >
                  <a href={telegramPairLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Telegram
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-500/20 text-white/40 hover:text-white/60 hover:border-red-500/30"
                  onClick={() => { setPairingChannel(null); setShowCliCommand(false); setCliCommand(''); setApiOutput('') }}
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          </ModalBackdrop>
        )}
      </CardContent>
    </Card>
  )
}
