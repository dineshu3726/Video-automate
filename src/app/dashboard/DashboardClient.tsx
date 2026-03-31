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
import ThemeToggle from '@/components/ThemeToggle'
import {
  Video,
  LogOut,
  LayoutGrid,
  Clock,
  CheckCircle2,
  Settings,
  Youtube,
  Play,
  Tv,
  Sparkles,
  Download,
} from 'lucide-react'

type Tab = 'player' | 'feed' | 'studio' | 'downloader'

interface TabDef {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabDef[] = [
  { id: 'player', label: 'Player', icon: Play },
  { id: 'feed', label: 'Feed', icon: Tv },
  { id: 'studio', label: 'Studio', icon: Sparkles },
  { id: 'downloader', label: 'Downloader', icon: Download },
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
      .from('video_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setJobs(data as VideoJob[])
  }, [supabase, user.id])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('video_jobs_live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [payload.new as VideoJob, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setJobs((prev) =>
              prev.map((j) => (j.id === payload.new.id ? (payload.new as VideoJob) : j))
            )
          } else if (payload.eventType === 'DELETE') {
            setJobs((prev) => prev.filter((j) => j.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  async function handleDeleteJob(jobId: string) {
    await supabase.from('video_jobs').delete().eq('id', jobId)
  }

  // Jobs currently in the active pipeline
  const activeJobs = jobs.filter((j) =>
    ['scripting', 'generating', 'processing'].includes(j.status)
  )

  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) =>
      ['pending', 'scripting', 'generating', 'processing'].includes(j.status)
    ).length,
    approved: jobs.filter((j) => j.status === 'approved' || j.status === 'published').length,
  }

  // Suppress unused variable warnings — these are used by StudioTab via props
  void handleDeleteJob
  void activeJobs
  void fetchJobs

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="text-text font-semibold">VideoForge</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted text-sm hidden sm:block">{user.email}</span>
            <Link
              href="/dashboard/downloader"
              className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition"
            >
              <Youtube className="w-4 h-4" />
              <span className="hidden sm:inline">Downloader</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Bar */}
        <div className="flex gap-1 bg-surface border border-border rounded-2xl p-1.5 mb-6">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-white text-[#2563EB] shadow border border-[#2563EB]/20 font-semibold'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm">{tab.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FB923C]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'player' && (
          <div className="py-2">
            <ShortsPlayer ytConnected={ytConnected} />
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <FeedTab ytConnected={ytConnected} />
          </div>
        )}

        {activeTab === 'studio' && (
          <>
            {/* Stats grid — only shown in studio tab */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: 'Total Jobs',
                  value: stats.total,
                  icon: LayoutGrid,
                  color: 'text-violet-400',
                },
                {
                  label: 'In Progress',
                  value: stats.pending,
                  icon: Clock,
                  color: 'text-yellow-400',
                },
                {
                  label: 'Approved',
                  value: stats.approved,
                  icon: CheckCircle2,
                  color: 'text-green-400',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-surface border border-border rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="text-muted text-xs">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-text">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <StudioTab user={user} initialJobs={jobs} />
            </div>
          </>
        )}

        {activeTab === 'downloader' && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <DownloaderTab />
          </div>
        )}

        {/* Invisible Veo orchestrator -- always rendered */}
        <VeoPoller jobs={jobs} />
      </main>
    </div>
  )
}
