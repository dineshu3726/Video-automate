'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { VideoJob } from '@/types'
import MetadataEditor, { VideoMetadata } from './MetadataEditor'
import {
  CheckCircle2, XCircle, Loader2, Play, Pause,
  Volume2, VolumeX, RotateCcw, ArrowLeft, FileText,
  RefreshCw, ChevronDown,
} from 'lucide-react'

interface Props {
  job: VideoJob
}

export default function ReviewStation({ job }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScript, setShowScript] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showRegenMenu, setShowRegenMenu] = useState(false)

  const [metadata, setMetadata] = useState<VideoMetadata>({
    title: job.metadata?.title ?? '',
    description: job.metadata?.description ?? '',
    tags: job.metadata?.tags ?? [],
  })

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  function restart() {
    const v = videoRef.current
    if (!v) return
    v.currentTime = 0
    v.play()
    setPlaying(true)
  }

  async function handleAction(chosen: 'approve' | 'reject') {
    setAction(chosen)
    setLoading(true)
    setError(null)

    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        action: chosen,
        ...(chosen === 'approve' ? { metadata } : {}),
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong')
      setAction(null)
      setLoading(false)
      return
    }

    // Navigate back to dashboard after a brief success flash
    setTimeout(() => router.push('/dashboard'), 800)
  }

  async function handleRegenerate(mode: 'video' | 'all') {
    setShowRegenMenu(false)
    setRegenerating(true)
    setError(null)
    const res = await fetch('/api/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, mode }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Regeneration failed')
      setRegenerating(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">
              {metadata.title || job.category}
            </p>
            <p className="text-gray-500 text-xs">{job.category}</p>
          </div>
          <span className="text-xs font-mono text-gray-700">{job.id.slice(0, 8)}…</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Left: 9:16 video player ── */}
          <div className="flex-shrink-0 w-full lg:w-auto flex flex-col items-center gap-4">
            <div
              className="relative bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl"
              style={{ width: '270px', aspectRatio: '9/16' }}
            >
              {job.video_url ? (
                <>
                  <video
                    ref={videoRef}
                    src={job.video_url}
                    className="w-full h-full object-cover"
                    muted={muted}
                    onEnded={() => setPlaying(false)}
                    onClick={togglePlay}
                    playsInline
                  />
                  {/* Overlay controls */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20"
                    >
                      {playing
                        ? <Pause className="w-6 h-6 text-white" />
                        : <Play className="w-6 h-6 text-white ml-0.5" />
                      }
                    </button>
                  </div>
                  {/* Bottom controls */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent">
                    <button
                      onClick={restart}
                      className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={() => setMuted(!muted)}
                      className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/70 transition"
                    >
                      {muted
                        ? <VolumeX className="w-3.5 h-3.5 text-white" />
                        : <Volume2 className="w-3.5 h-3.5 text-white" />
                      }
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-600 text-sm text-center px-4">No video available</p>
                </div>
              )}
            </div>

            {/* Approve / Reject buttons */}
            <div className="flex gap-3 w-full" style={{ maxWidth: '270px' }}>
              <button
                onClick={() => handleAction('reject')}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition ${
                  action === 'reject'
                    ? 'bg-red-500 text-white'
                    : 'bg-red-900/30 border border-red-800/60 text-red-400 hover:bg-red-900/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {action === 'reject' && loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />
                }
                Reject
              </button>
              <button
                onClick={() => handleAction('approve')}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition ${
                  action === 'approve'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-900/30 border border-green-800/60 text-green-400 hover:bg-green-900/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {action === 'approve' && loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Approve
              </button>
            </div>

            {/* Regenerate dropdown */}
            <div className="relative w-full" style={{ maxWidth: '270px' }}>
              <div className="flex rounded-xl overflow-hidden border border-gray-700">
                <button
                  onClick={() => handleRegenerate('video')}
                  disabled={loading || regenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {regenerating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />
                  }
                  Regenerate Video
                </button>
                <button
                  onClick={() => setShowRegenMenu(!showRegenMenu)}
                  disabled={loading || regenerating}
                  className="px-2.5 bg-gray-800 hover:bg-gray-700 border-l border-gray-700 text-gray-400 hover:text-white transition disabled:opacity-50"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {showRegenMenu && (
                <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-10">
                  <button
                    onClick={() => handleRegenerate('video')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                  >
                    <p className="font-medium">Regenerate Video Only</p>
                    <p className="text-xs text-gray-500 mt-0.5">Keep script, fetch new visuals & sound</p>
                  </button>
                  <div className="border-t border-gray-700" />
                  <button
                    onClick={() => handleRegenerate('all')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                  >
                    <p className="font-medium">Regenerate Everything</p>
                    <p className="text-xs text-gray-500 mt-0.5">New script, new visuals & sound</p>
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center bg-red-900/30 border border-red-800/60 rounded-lg px-3 py-2 w-full" style={{ maxWidth: '270px' }}>
                {error}
              </p>
            )}
          </div>

          {/* ── Right: Metadata + Script ── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Metadata editor */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <MetadataEditor initial={metadata} onChange={setMetadata} />
            </div>

            {/* Script accordion */}
            {job.script && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowScript(!showScript)}
                  className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-gray-300 hover:text-white transition"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    View Script
                  </span>
                  <span className="text-gray-600 text-xs">{showScript ? '▲' : '▼'}</span>
                </button>
                {showScript && (
                  <div className="px-6 pb-6 border-t border-gray-800">
                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap mt-4">
                      {job.script}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
