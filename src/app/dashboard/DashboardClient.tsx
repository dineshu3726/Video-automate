'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { VideoJob } from '@/types'
import Link from 'next/link'
import FeedTab from '@/components/tabs/FeedTab'
import StudioTab from '@/components/tabs/StudioTab'
import DownloaderTab from '@/components/tabs/DownloaderTab'
import ShortsPlayer from '@/components/feed/ShortsPlayer'
import VeoPoller from '@/components/VeoPoller'
import {
  LogOut, LayoutGrid, Clock, CheckCircle2,
  Settings, Play, Tv, Sparkles, Download, Zap,
} from 'lucide-react'

type Tab = 'player' | 'feed' | 'studio' | 'downloader'

const TABS = [
  { id: 'player' as Tab,     label: 'Player',     icon: Play },
  { id: 'feed' as Tab,       label: 'Feed',       icon: Tv },
  { id: 'studio' as Tab,     label: 'Studio',     icon: Sparkles },
  { id: 'downloader' as Tab, label: 'Downloader', icon: Download },
]

interface Props {
  user: User
  initialJobs: VideoJob[]
  ytConnected: boolean
}

export default function DashboardClient({ user, initialJobs, ytConnected }: Props) {
  const [jobs, setJobs] = useState<VideoJob[]>(initialJobs)
  const [activeTab, setActiveTab] = useState<Tab>('player')
  const supabase = createClient()

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('video_jobs').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20)
    if (data) setJobs(data as VideoJob[])
  }, [supabase, user.id])

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

  void fetchJobs

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => ['pending','scripting','generating','processing'].includes(j.status)).length,
    approved: jobs.filter(j => j.status === 'approved' || j.status === 'published').length,
  }

  return (
    <div className="min-h-screen bg-[#0B0B14]">

      {/* ── Header ── */}
      <header className="border-b border-[#252540] bg-[#13131F]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #E91E8C 0%, #7C3AED 100%)' }}>
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-white font-black text-xl tracking-tight">
              vyb<span style={{ color: '#E91E8C' }}>line</span>
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="text-[#7A7A9D] text-sm hidden sm:block">{user.email}</span>
            <Link href="/dashboard/settings"
              className="p-2 text-[#7A7A9D] hover:text-white rounded-lg hover:bg-[#1C1C2E] transition">
              <Settings className="w-4 h-4" />
            </Link>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-[#7A7A9D] hover:text-white text-sm transition px-3 py-1.5 rounded-lg hover:bg-[#1C1C2E]">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 bg-[#13131F] border border-[#252540] rounded-2xl p-1.5 mb-6">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all relative overflow-hidden"
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(233,30,140,0.15) 0%, rgba(124,58,237,0.15) 100%)',
                  border: '1px solid rgba(233,30,140,0.3)',
                } : {}}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#E91E8C]' : 'text-[#7A7A9D]'}`} />
                <span className={`text-xs font-semibold ${active ? 'text-white' : 'text-[#7A7A9D]'}`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #E91E8C, #7C3AED)' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'player' && (
          <div className="py-2">
            <ShortsPlayer ytConnected={ytConnected} />
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="bg-[#13131F] border border-[#252540] rounded-2xl p-6">
            <FeedTab ytConnected={ytConnected} />
          </div>
        )}

        {activeTab === 'studio' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Jobs',  value: stats.total,    icon: LayoutGrid,   color: '#7C3AED' },
                { label: 'In Progress', value: stats.pending,  icon: Clock,        color: '#E91E8C' },
                { label: 'Approved',    value: stats.approved, icon: CheckCircle2, color: '#10B981' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-[#13131F] border border-[#252540] rounded-xl p-4 hover:border-[#E91E8C]/20 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-[#7A7A9D] text-xs">{label}</span>
                  </div>
                  <p className="text-2xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="bg-[#13131F] border border-[#252540] rounded-2xl p-6">
              <StudioTab user={user} initialJobs={jobs} />
            </div>
          </>
        )}

        {activeTab === 'downloader' && (
          <div className="bg-[#13131F] border border-[#252540] rounded-2xl p-6">
            <DownloaderTab />
          </div>
        )}

        <VeoPoller jobs={jobs} />
      </main>
    </div>
  )
}
