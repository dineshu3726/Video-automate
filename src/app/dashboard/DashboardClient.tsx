'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { VideoJob } from '@/types'
import Link from 'next/link'
import CategoryInput from '@/components/CategoryInput'
import SimilarVideoInput from '@/components/SimilarVideoInput'
import MediaReferenceInput from '@/components/MediaReferenceInput'
import VideoJobCard from '@/components/VideoJobCard'
import GenerationStatus from '@/components/GenerationStatus'
import VeoPoller from '@/components/VeoPoller'
import { Video, LogOut, LayoutGrid, Clock, CheckCircle2, Settings, Youtube } from 'lucide-react'

interface Props {
  user: User
  initialJobs: VideoJob[]
}

export default function DashboardClient({ user, initialJobs }: Props) {
  const [jobs, setJobs] = useState<VideoJob[]>(initialJobs)
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

  // Real-time subscription — updates any job card the moment the DB row changes
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

    return () => { supabase.removeChannel(channel) }
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

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">VideoForge</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm hidden sm:block">{user.email}</span>
            <Link
              href="/dashboard/downloader"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <Youtube className="w-4 h-4" />
              <span className="hidden sm:inline">Downloader</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Video Pipeline</h1>
          <p className="text-gray-400 text-sm mt-1">
            Generate, review, and publish AI-powered Shorts &amp; Reels
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Jobs',  value: stats.total,    icon: LayoutGrid,  color: 'text-violet-400' },
            { label: 'In Progress', value: stats.pending,  icon: Clock,       color: 'text-yellow-400' },
            { label: 'Approved',    value: stats.approved, icon: CheckCircle2,color: 'text-green-400'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-gray-400 text-xs">{label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Invisible Veo orchestrator — watches for 'generating' jobs and polls Veo */}
        <VeoPoller jobs={jobs} />

        {/* Generate Input */}
        <CategoryInput userId={user.id} onJobCreated={fetchJobs} />
        <SimilarVideoInput userId={user.id} onJobCreated={fetchJobs} />
        <MediaReferenceInput userId={user.id} onJobCreated={fetchJobs} />

        {/* Active pipeline trackers */}
        {activeJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-white">Active Pipeline</h2>
            {activeJobs.map((job) => (
              <GenerationStatus key={job.id} status={job.status} jobId={job.id} />
            ))}
          </div>
        )}

        {/* Job List */}
        <div>
          <h2 className="text-base font-semibold text-white mb-4">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <div className="bg-gray-900 border border-dashed border-gray-800 rounded-xl p-10 text-center">
              <Video className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No videos yet. Generate your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <VideoJobCard key={job.id} job={job} onDelete={handleDeleteJob} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
