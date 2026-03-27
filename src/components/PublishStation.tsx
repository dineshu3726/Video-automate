'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VideoJob } from '@/types'
import {
  ArrowLeft, Youtube, Instagram, Loader2, CheckCircle2,
  ExternalLink, AlertCircle, Send,
} from 'lucide-react'

interface Props {
  job: VideoJob
  ytConnected: boolean
  igConnected: boolean
}

type Platform = 'youtube' | 'instagram'

export default function PublishStation({ job, ytConnected, igConnected }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<Platform>>(new Set())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    publishUrls: Record<string, string>
    errors: Record<string, string>
  } | null>(null)

  const existingUrls = job.metadata?.publish_urls ?? {}

  function toggle(p: Platform) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  async function handlePublish() {
    if (selected.size === 0) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, platforms: [...selected] }),
    })

    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  const platforms: { id: Platform; label: string; icon: React.ReactNode; connected: boolean }[] = [
    {
      id: 'youtube',
      label: 'YouTube Shorts',
      icon: <Youtube className="w-5 h-5" />,
      connected: ytConnected,
    },
    {
      id: 'instagram',
      label: 'Instagram Reels',
      icon: <Instagram className="w-5 h-5" />,
      connected: igConnected,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <p className="text-white font-medium text-sm truncate">
            {job.metadata?.title ?? job.category}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publish Video</h1>
          <p className="text-gray-400 text-sm mt-1">
            Select where to post this approved Short/Reel.
          </p>
        </div>

        {/* Video summary */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
          <p className="text-white font-medium">{job.metadata?.title ?? job.category}</p>
          <p className="text-gray-400 text-sm">{job.metadata?.description}</p>
          {(job.metadata?.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.metadata!.tags!.map((t) => (
                <span key={t} className="text-xs text-violet-400 bg-violet-900/30 border border-violet-800/50 px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Platform selector */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-300">Choose platforms</h2>
          {platforms.map(({ id, label, icon, connected }) => {
            const alreadyPublished = !!existingUrls[id]
            const isSelected = selected.has(id)

            return (
              <button
                key={id}
                type="button"
                disabled={!connected || alreadyPublished}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition text-left ${
                  alreadyPublished
                    ? 'border-green-800/50 bg-green-900/10 cursor-default'
                    : isSelected
                    ? 'border-violet-500 bg-violet-900/20'
                    : connected
                    ? 'border-gray-700 bg-gray-900 hover:border-gray-600'
                    : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`${alreadyPublished ? 'text-green-400' : isSelected ? 'text-violet-400' : 'text-gray-500'}`}>
                  {icon}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-xs mt-0.5 text-gray-500">
                    {alreadyPublished
                      ? 'Already published'
                      : !connected
                      ? 'Not connected — go to Settings'
                      : isSelected
                      ? 'Selected'
                      : 'Click to select'}
                  </p>
                </div>
                {alreadyPublished && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                {isSelected && !alreadyPublished && (
                  <div className="w-4 h-4 rounded-full bg-violet-500 flex-shrink-0" />
                )}
              </button>
            )
          })}

          {(!ytConnected || !igConnected) && (
            <p className="text-xs text-gray-600">
              Connect missing platforms in{' '}
              <a href="/dashboard/settings" className="text-violet-400 hover:underline">
                Settings
              </a>
              .
            </p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="space-y-3">
            {Object.entries(result.publishUrls).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-900/20 border border-green-800/50 rounded-xl p-4 hover:border-green-700 transition"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-300 text-sm font-medium capitalize">{platform} — Published!</p>
                  <p className="text-gray-500 text-xs truncate">{url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </a>
            ))}

            {Object.entries(result.errors).map(([platform, msg]) => (
              <div
                key={platform}
                className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 rounded-xl p-4"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-medium capitalize">{platform} failed</p>
                  <p className="text-gray-500 text-xs mt-0.5">{msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Publish button */}
        {!result?.publishUrls || Object.keys(result.publishUrls).length < platforms.filter(p => p.connected).length ? (
          <button
            onClick={handlePublish}
            disabled={loading || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Publishing…' : `Publish to ${selected.size} platform${selected.size !== 1 ? 's' : ''}`}
          </button>
        ) : (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3.5 rounded-xl transition"
          >
            Back to Dashboard
          </button>
        )}
      </main>
    </div>
  )
}
