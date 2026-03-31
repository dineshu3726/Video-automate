'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Loader2, ChevronDown, AlertCircle } from 'lucide-react'

const CATEGORY_SUGGESTIONS = [
  'Motivational Quotes & Success',
  'Mind-Blowing Facts',
  'Psychology & Human Behavior',
  'History\'s Dark Secrets',
  'Life Hacks That Save Money',
  'Luxury Lifestyle & Wealth',
  'Passive Income & Side Hustles',
  'True Crime & Mysteries',
  'Science Facts That Shock You',
  'Relationship & Dating Advice',
  'Tech & Gadgets',
  'Finance & Investing',
  'Fitness & Health',
  'Travel & Adventure',
  'Food & Recipes',
  'Productivity & Mindset',
  'AI & Future Tech',
  'Gaming',
  'Fashion & Style',
  'DIY & Crafts',
  'ASMR & Satisfying Sounds',
]

type Stage = 'idle' | 'creating' | 'scripting' | 'done' | 'error'

const STAGE_LABEL: Record<Stage, string> = {
  idle:     'Generate Video',
  creating: 'Creating job…',
  scripting:'Gemini is writing script…',
  done:     'Script ready!',
  error:    'Try again',
}

interface Props {
  userId: string
  onJobCreated: () => void
}

export default function CategoryInput({ userId, onJobCreated }: Props) {
  const [category, setCategory] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const supabase = createClient()
  const isLoading = stage === 'creating' || stage === 'scripting'

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!category.trim() || isLoading) return

    setError(null)

    setStage('creating')
    const { data: job, error: insertError } = await supabase
      .from('video_jobs')
      .insert({ user_id: userId, category: category.trim(), status: 'pending' })
      .select('id')
      .single()

    if (insertError || !job) {
      setError(insertError?.message ?? 'Failed to create job')
      setStage('error')
      return
    }

    onJobCreated()

    setStage('scripting')
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, category: category.trim() }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Generation failed')
      setStage('error')
      onJobCreated()
      return
    }

    setStage('done')
    setCategory('')
    onJobCreated()

    setTimeout(() => setStage('idle'), 2000)
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-text mb-1">Generate a New Video</h2>
      <p className="text-muted text-sm mb-5">
        Enter a niche or topic — Gemini will script it, then Pexels + FFmpeg will render the video.
      </p>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            disabled={isLoading}
            placeholder="e.g. AI & Future Tech, Fitness Tips, Investing 101…"
            className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition pr-10 disabled:opacity-50"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />

          {showSuggestions && !isLoading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface2 border border-border rounded-xl overflow-hidden z-10 shadow-xl">
              {CATEGORY_SUGGESTIONS.filter((s) =>
                s.toLowerCase().includes(category.toLowerCase())
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={() => setCategory(suggestion)}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted hover:bg-surface hover:text-text transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-violet-300 bg-violet-900/20 border border-violet-900/40 rounded-lg px-4 py-2.5">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>
              {stage === 'creating' ? 'Creating job…' : 'Gemini is writing your script and video prompt…'}
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
          disabled={isLoading || !category.trim()}
          className={`w-full font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 ${
            stage === 'done'
              ? 'bg-green-600 text-white'
              : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {STAGE_LABEL[stage]}
        </button>
      </form>
    </div>
  )
}
