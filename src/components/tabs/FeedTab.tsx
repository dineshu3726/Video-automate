'use client'
import { useState, useEffect } from 'react'
import { Loader2, Youtube, RefreshCw } from 'lucide-react'
import VideoCard from '@/components/feed/VideoCard'
import VideoPlayer from '@/components/feed/VideoPlayer'
import Link from 'next/link'

interface FeedItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  viewCount: string
  publishedAt: string
}

interface Props {
  ytConnected: boolean
}

export default function FeedTab({ ytConnected }: Props) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if (ytConnected) fetchFeed()
  }, [ytConnected])

  async function fetchFeed() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feed/shorts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load feed')
      setItems(data.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }

  if (!ytConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background:'rgba(201,168,76,0.1)', border:'1px solid rgba(201,168,76,0.2)' }}>
          <Youtube className="w-8 h-8" style={{ color:'#C9A84C' }} />
        </div>
        <h2 className="sb-heading text-text text-lg font-semibold">Connect YouTube to load your feed</h2>
        <p className="text-muted text-sm text-center max-w-sm">Your personalized Shorts feed from your subscribed channels will appear here.</p>
        <Link
          href="/api/auth/youtube"
          className="sb-btn-primary font-medium px-5 py-2.5 rounded-xl flex items-center gap-2"
        >
          <Youtube className="w-4 h-4" /> Connect YouTube
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="sb-heading text-text font-semibold text-lg">My Shorts Feed</h2>
          <p className="text-muted text-sm">Latest Shorts from your subscriptions</p>
        </div>
        <button
          onClick={fetchFeed}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text border border-border rounded-lg px-3 py-1.5 transition hover:bg-surface disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900/40 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {loading && !items.length && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20 text-muted text-sm">No Shorts found from your subscriptions.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map(item => (
          <VideoCard
            key={item.videoId}
            {...item}
            onClick={() => setSelectedId(item.videoId)}
          />
        ))}
      </div>

      {selectedId && (
        <VideoPlayer videoId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
