'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Video, ArrowLeft, Youtube, Instagram,
  CheckCircle2, XCircle, Loader2, Settings, Clock,
} from 'lucide-react'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

interface Props {
  userId: string
  email: string
  ytConnected: boolean
  igConnected: boolean
  postInterval: number
  preferredTime: string
  flashConnected: string | null
  flashError: string | null
}

export default function AccountSettings({
  userId, email, ytConnected, igConnected,
  postInterval: initialInterval, preferredTime: initialTime,
  flashConnected, flashError,
}: Props) {
  const [interval, setInterval] = useState(String(initialInterval))
  const [time, setTime] = useState(initialTime.slice(0, 5))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const supabase = createClient()

  async function disconnectPlatform(platform: 'youtube' | 'instagram') {
    setDisconnecting(platform)
    const field = platform === 'youtube' ? 'yt_token' : 'ig_token'
    await supabase.from('profiles').update({ [field]: null }).eq('id', userId)
    setDisconnecting(null)
    window.location.reload()
  }

  async function saveSchedule() {
    setSaving(true)
    await supabase.from('settings').upsert({
      user_id: userId,
      post_interval: parseInt(interval),
      preferred_time: `${time}:00`,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const platforms = [
    {
      id: 'youtube',
      label: 'YouTube',
      sublabel: 'Publish as YouTube Shorts',
      icon: <Youtube className="w-5 h-5" />,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      border: 'border-red-800/40',
      connected: ytConnected,
      connectHref: '/api/auth/youtube',
    },
    {
      id: 'instagram',
      label: 'Instagram',
      sublabel: 'Publish as Instagram Reels',
      icon: <Instagram className="w-5 h-5" />,
      color: 'text-pink-400',
      bg: 'bg-pink-900/20',
      border: 'border-pink-800/40',
      connected: igConnected,
      connectHref: '/api/auth/instagram',
    },
  ]

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="sb-wave-border border-b border-border bg-surface/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 flex-1">
            <Settings className="w-4 h-4 text-muted" />
            <span className="text-text font-medium text-sm">Settings</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {flashConnected && (
          <div className="flex items-center gap-2 bg-green-900/30 border border-green-800/50 rounded-xl px-4 py-3 text-green-300 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {flashConnected === 'youtube' ? 'YouTube' : 'Instagram'} account connected!
          </div>
        )}
        {flashError && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 text-red-300 text-sm">
            <XCircle className="w-4 h-4" />
            {decodeURIComponent(flashError)}
          </div>
        )}

        {/* Account */}
        <div>
          <h2 className="sb-heading text-xs font-semibold text-muted uppercase tracking-wider mb-3">Account</h2>
          <div className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background:'linear-gradient(135deg, #0097B2 0%, #00C8E0 100%)', color:'#fff' }}>
              {email[0]?.toUpperCase()}
            </div>
            <span className="text-muted text-sm">{email}</span>
          </div>
        </div>

        {/* Social platforms */}
        <div>
          <h2 className="sb-heading text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Connected Platforms
          </h2>
          <div className="space-y-3">
            {platforms.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 rounded-xl border p-4 ${p.bg} ${p.border}`}
              >
                <div className={p.color}>{p.icon}</div>
                <div className="flex-1">
                  <p className="text-text text-sm font-medium">{p.label}</p>
                  <p className="text-muted text-xs">{p.sublabel}</p>
                </div>
                {p.connected ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Connected
                    </div>
                    <button
                      onClick={() => disconnectPlatform(p.id as 'youtube' | 'instagram')}
                      disabled={disconnecting === p.id}
                      className="text-xs text-muted hover:text-red-400 border border-border hover:border-red-400/40 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {disconnecting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Disconnect'}
                    </button>
                    <a
                      href={p.connectHref}
                      className="text-xs font-medium bg-surface2 hover:bg-surface border border-border text-text px-2.5 py-1.5 rounded-lg transition"
                    >
                      Reconnect
                    </a>
                  </div>
                ) : (
                  <a
                    href={p.connectHref}
                    className="text-xs font-medium bg-surface2 hover:bg-surface border border-border text-text px-3 py-1.5 rounded-lg transition"
                  >
                    Connect
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Post schedule */}
        <div>
          <h2 className="sb-heading text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Post Schedule
          </h2>
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">
                Post every N hours (auto-publish approved videos)
              </label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition"
              >
                {[1, 2, 4, 6, 12, 24, 48, 72].map((h) => (
                  <option key={h} value={h}>
                    Every {h} hour{h > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Preferred posting time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition"
              />
            </div>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="sb-btn-primary flex items-center gap-2 disabled:opacity-50 text-sm px-4 py-2 rounded-lg"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saved ? 'Saved!' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {/* Vybeline logo */}
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background:'linear-gradient(135deg, #0097B2 0%, #00C8E0 100%)' }}>
            <Video className="w-3 h-3" style={{ color:'#fff' }} />
          </div>
          <span className="sb-heading text-muted/50 text-xs">VybLiNe</span>
        </div>
      </main>
    </div>
  )
}
