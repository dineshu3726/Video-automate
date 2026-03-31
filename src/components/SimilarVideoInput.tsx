'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Link2, Loader2, AlertCircle, Youtube, Instagram } from 'lucide-react'

function detectPlatform(url: string): { label: string; color: string } | null {
  if (url.includes('youtube.com') || url.includes('youtu.be'))
    return { label: 'YouTube', color: 'text-red-400' }
  if (url.includes('instagram.com'))
    return { label: 'Instagram', color: 'text-pink-400' }
  if (url.includes('pinterest.com') || url.includes('pin.it'))
    return { label: 'Pinterest', color: 'text-rose-400' }
  return null
}

type Stage = 'idle' | 'creating' | 'analyzing' | 'done' | 'error'

interface Props {
  userId: string
  onJobCreated: () => void
}

export default function SimilarVideoInput({ userId, onJobCreated }: Props) {
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const supabase = createClient()
  const isLoading = stage === 'creating' || stage === 'analyzing'
  const platform = url ? detectPlatform(url) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || isLoading) return

    try { new URL(url) } catch {
      setError('Please enter a valid URL')
      setStage('error')
      return
    }

    setError(null)
    setStage('creating')

    const category = platform
      ? `Similar to ${platform.label} video`
      : 'Similar to reference video'

    const { data: job, error: insertError } = await supabase
      .from('video_jobs')
      .insert({ user_id: userId, category, status: 'pending' })
      .select('id')
      .single()

    if (insertError || !job) {
      setError(insertError?.message ?? 'Failed to create job')
      setStage('error')
      return
    }

    onJobCreated()

    setStage('analyzing')
    const res = await fetch('/api/generate-similar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, url: url.trim() }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Analysis failed')
      setStage('error')
      onJobCreated()
      return
    }

    setStage('done')
    setUrl('')
    onJobCreated()
    setTimeout(() => { setStage('idle') }, 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm hover:bg-surface2/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600/20 rounded-lg flex items-center justify-center">
            <Link2 className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-text font-medium text-sm">Generate Similar Video</p>
            <p className="text-muted text-xs">Paste a YouTube, Instagram, or Pinterest URL</p>
          </div>
        </div>
        <span className="text-muted/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-border">
          <div className="flex gap-2 mt-4 mb-4">
            {[
              { icon: <Youtube className="w-3.5 h-3.5" />, label: 'YouTube', color: 'text-red-400 border-red-900/40 bg-red-900/10' },
              { icon: <Instagram className="w-3.5 h-3.5" />, label: 'Instagram', color: 'text-pink-400 border-pink-900/40 bg-pink-900/10' },
              { icon: <span className="text-xs font-bold">P</span>, label: 'Pinterest', color: 'text-rose-400 border-rose-900/40 bg-rose-900/10' },
            ].map(({ icon, label, color }) => (
              <span key={label} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${color}`}>
                {icon} {label}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); setStage('idle') }}
                disabled={isLoading}
                placeholder="https://www.youtube.com/shorts/..."
                className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition pr-24 disabled:opacity-50"
              />
              {platform && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${platform.color}`}>
                  {platform.label}
                </span>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/20 border border-indigo-900/40 rounded-lg px-4 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <span>
                  {stage === 'creating' ? 'Creating job…' : 'Gemini is analyzing the reference video…'}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className={`w-full font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 ${
                stage === 'done'
                  ? 'bg-green-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {stage === 'done' ? 'Script ready!' : stage === 'analyzing' ? 'Analyzing…' : 'Generate Similar Video'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
