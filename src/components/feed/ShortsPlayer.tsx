'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Youtube, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface LikedItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  publishedAt: string
}

interface Props {
  ytConnected: boolean
}

export default function ShortsPlayer({ ytConnected }: Props) {
  const [items, setItems] = useState<LikedItem[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const goPrev = useCallback(() => {
    setIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((prev) => Math.min(items.length - 1, prev + 1))
  }, [items.length])

  useEffect(() => {
    if (!ytConnected) return
    setLoading(true)
    setError(null)
    fetch('/api/feed/liked')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setItems(data.items ?? [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load liked videos')
      })
      .finally(() => setLoading(false))
  }, [ytConnected])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return
    const touch = e.changedTouches[0]
    const diffX = touch.clientX - touchStartRef.current.x
    const diffY = touch.clientY - touchStartRef.current.y
    touchStartRef.current = null

    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goNext()
      } else {
        goPrev()
      }
    }
  }

  // Not connected
  if (!ytConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 bg-[#2563EB]/10 rounded-2xl flex items-center justify-center">
          <Youtube className="w-8 h-8 text-[#2563EB]" />
        </div>
        <h2 className="text-text text-lg font-semibold text-center">
          Connect YouTube to view your liked Shorts
        </h2>
        <p className="text-muted text-sm text-center max-w-sm">
          Your liked YouTube videos will appear here in a swipeable player.
        </p>
        <Link
          href="/api/auth/youtube"
          className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-medium px-5 py-2.5 rounded-xl transition flex items-center gap-2"
        >
          <Youtube className="w-4 h-4" /> Connect YouTube
        </Link>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  // No items
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted text-sm">No liked videos found.</p>
      </div>
    )
  }

  // Dot indicators (max 7)
  const maxDots = 7
  const totalItems = items.length
  let dotStart = Math.max(0, index - Math.floor(maxDots / 2))
  let dotEnd = dotStart + maxDots
  if (dotEnd > totalItems) {
    dotEnd = totalItems
    dotStart = Math.max(0, dotEnd - maxDots)
  }
  const dots = Array.from({ length: dotEnd - dotStart }, (_, i) => dotStart + i)

  const currentItem = items[index]

  return (
    <div className="flex flex-col items-center py-6 gap-5">
      {/* Player area */}
      <div className="relative flex items-center gap-4">
        {/* Left arrow */}
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="w-10 h-10 rounded-full bg-white border border-[#e2e8f0] shadow text-[#2563EB] flex items-center justify-center transition hover:bg-[#f0f4ff] disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Phone container */}
        <div
          className="rounded-3xl shadow-2xl overflow-hidden border-4 border-[#2563EB]/20 bg-black"
          style={{ width: '360px', aspectRatio: '9/16' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <iframe
            key={currentItem.videoId}
            src={`https://www.youtube.com/embed/${currentItem.videoId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Right arrow */}
        <button
          onClick={goNext}
          disabled={index === items.length - 1}
          className="w-10 h-10 rounded-full bg-white border border-[#e2e8f0] shadow text-[#2563EB] flex items-center justify-center transition hover:bg-[#f0f4ff] disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Video counter */}
      <p className="text-muted text-xs">
        {index + 1} / {items.length}
      </p>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5">
        {dots.map((dotIdx) => (
          <span
            key={dotIdx}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              dotIdx === index ? 'bg-[#2563EB]' : 'bg-[#e2e8f0]'
            }`}
          />
        ))}
      </div>

      {/* Video info */}
      <div className="text-center max-w-sm px-4">
        <h3 className="text-text font-semibold text-sm leading-snug line-clamp-2">
          {currentItem.title}
        </h3>
        <p className="text-muted text-sm mt-1">{currentItem.channelTitle}</p>
      </div>
    </div>
  )
}
