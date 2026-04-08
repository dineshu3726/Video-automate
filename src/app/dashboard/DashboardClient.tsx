'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { VideoJob } from '@/types'
import Link from 'next/link'
import FeedTab from '@/components/tabs/FeedTab'
import StudioTab from '@/components/tabs/StudioTab'
import DownloaderTab from '@/components/tabs/DownloaderTab'
import VeoPoller from '@/components/VeoPoller'
import ThemeToggle from '@/components/ThemeToggle'
import {
  LogOut, LayoutGrid, Clock, CheckCircle2,
  Settings, Tv, Sparkles, Download, Home,
} from 'lucide-react'
import { VybLiNeIcon } from '@/components/VybLineLogo'

type Tab = 'studio' | 'feed' | 'downloader'

const TABS = [
  { id: 'studio'     as Tab, label: 'Studio',     icon: Sparkles },
  { id: 'feed'       as Tab, label: 'Feed',        icon: Tv },
  { id: 'downloader' as Tab, label: 'Downloader',  icon: Download },
]

interface Props {
  user: User
  initialJobs: VideoJob[]
  ytConnected: boolean
}

export default function DashboardClient({ user, initialJobs, ytConnected }: Props) {
  const [jobs, setJobs] = useState<VideoJob[]>(initialJobs)
  const [activeTab, setActiveTab] = useState<Tab>('studio')
  const supabase = createClient()

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('video_jobs').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setJobs(data as VideoJob[])
  }, [supabase, user.id])

  void fetchJobs

  useEffect(() => {
    const channel = supabase.channel('video_jobs_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_jobs', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setJobs(p => [payload.new as VideoJob, ...p])
          else if (payload.eventType === 'UPDATE') setJobs(p => p.map(j => j.id === payload.new.id ? payload.new as VideoJob : j))
          else if (payload.eventType === 'DELETE') setJobs(p => p.filter(j => j.id !== payload.old.id))
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, user.id])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => ['pending','scripting','generating','processing'].includes(j.status)).length,
    approved: jobs.filter(j => j.status === 'approved' || j.status === 'published').length,
  }

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Header ── */}
      <header className="sb-wave-border border-b border-border bg-surface/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + Home link */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <VybLiNeIcon size={36} />
              <span className="sb-heading text-text font-bold text-xl tracking-wide group-hover:opacity-80 transition">
                <span style={{ color:'#00C8E0' }}>Vyb</span>LiNe
              </span>
            </Link>
            <span className="hidden sm:block text-muted text-xs px-2 py-0.5 rounded border border-border">Studio</span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <Link href="/"
              className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition px-3 py-1.5 rounded-lg hover:bg-surface2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-muted text-sm hidden sm:block">{user.email}</span>
            <Link href="/dashboard/settings"
              className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface2 transition">
              <Settings className="w-4 h-4" />
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition px-3 py-1.5 rounded-lg hover:bg-surface2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 bg-surface border border-border rounded-2xl p-1.5 mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative overflow-hidden"
                style={active ? {
                  background:'linear-gradient(135deg,rgba(201,168,76,0.1),rgba(20,184,166,0.08))',
                  border:'1px solid rgba(201,168,76,0.22)',
                } : {}}>
                <Icon className="w-4 h-4" style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted)' }} />
                <span className="text-xs font-semibold" style={{ color: active ? 'var(--color-text)' : 'var(--color-muted)' }}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background:'linear-gradient(90deg,#0097B2,#00C8E0,#E91E8C)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'studio' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label:'Total Jobs',   value:stats.total,    icon:LayoutGrid,   accent:'var(--color-accent)' },
                { label:'In Progress',  value:stats.pending,  icon:Clock,        accent:'var(--color-primary)' },
                { label:'Approved',     value:stats.approved, icon:CheckCircle2, accent:'#34d399' },
              ].map(({ label, value, icon: Icon, accent }) => (
                <div key={label} className="bg-surface border border-border rounded-xl p-4 transition"
                  onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(201,168,76,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='var(--color-border)')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color:accent }} />
                    <span className="text-muted text-xs">{label}</span>
                  </div>
                  <p className="sb-heading text-2xl font-bold text-text">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6">
              <StudioTab user={user} initialJobs={jobs} />
            </div>
          </>
        )}

        {activeTab === 'feed' && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <FeedTab ytConnected={ytConnected} />
          </div>
        )}

        {activeTab === 'downloader' && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <DownloaderTab />
          </div>
        )}

        <VeoPoller jobs={jobs} />
      </main>
    </div>
  )
}
