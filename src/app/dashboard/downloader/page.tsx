'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import {
  ArrowLeft, Download, Loader2, AlertCircle,
  Film, Music, Youtube, Clock, Eye, User,
} from 'lucide-react'

interface VideoFormat {
  itag: string
  quality: string
  label: string
  container: string
  hasAudio: boolean
  hasVideo: boolean
  approxSizeMB: string | null
}

interface VideoInfo {
  title: string
  author: string
  thumbnail: string
  lengthSeconds: string
  viewCount: string
  formats: VideoFormat[]
}

function fmtDuration(sec: string) {
  const s = parseInt(sec)
  if (isNaN(s)) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${m}:${String(ss).padStart(2, '0')}`
}

function fmtViews(n: string) {
  const num = parseInt(n)
  if (isNaN(num)) return ''
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M views`
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K views`
  return `${num} views`
}

export default function DownloaderPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setInfo(null)

    const res = await fetch('/api/ytdl/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to fetch video info')
      return
    }
    setInfo(data)
  }

  async function handleDownload(format: VideoFormat) {
    if (!info) return
    setDownloading(format.itag)
    try {
      const downloadUrl = `/api/ytdl/download?url=${encodeURIComponent(url)}&itag=${format.itag}`
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setTimeout(() => setDownloading(null), 2000)
    }
  }

  const videoFormats = info?.formats.filter((f) => f.hasVideo) ?? []
  const audioFormats = info?.formats.filter((f) => !f.hasVideo) ?? []

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-muted hover:text-text text-sm transition"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2 flex-1">
            <Youtube className="w-4 h-4 text-red-400" />
            <span className="text-text font-medium text-sm">YouTube Downloader</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-red-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Youtube className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-text">YouTube Video Downloader</h1>
          <p className="text-muted text-sm">Paste a YouTube URL to download the video in your preferred quality</p>
        </div>

        {/* URL Input */}
        <form onSubmit={handleFetch} className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null); setInfo(null) }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl transition flex items-center gap-2 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {loading ? 'Fetching…' : 'Fetch'}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Video Info Card */}
        {info && (
          <div className="space-y-6">
            {/* Thumbnail + meta */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {info.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  className="w-full aspect-video object-cover"
                />
              )}
              <div className="p-5 space-y-3">
                <h2 className="text-text font-semibold text-base leading-snug">{info.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                  {info.author && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {info.author}
                    </span>
                  )}
                  {info.lengthSeconds && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> {fmtDuration(info.lengthSeconds)}
                    </span>
                  )}
                  {info.viewCount && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> {fmtViews(info.viewCount)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video formats */}
            {videoFormats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Film className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-text">Video</h3>
                  <span className="text-xs text-muted/50">(includes audio)</span>
                </div>
                <div className="space-y-2">
                  {videoFormats.map((f) => (
                    <div
                      key={f.itag}
                      className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text">{f.label}</span>
                        <span className="text-xs text-muted/50 uppercase">{f.container}</span>
                        {f.approxSizeMB && (
                          <span className="text-xs text-muted">~{f.approxSizeMB} MB</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        disabled={downloading !== null}
                        className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        {downloading === f.itag
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                        {downloading === f.itag ? 'Starting…' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio formats */}
            {audioFormats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-text">Audio Only</h3>
                </div>
                <div className="space-y-2">
                  {audioFormats.map((f) => (
                    <div
                      key={f.itag}
                      className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text">{f.label}</span>
                        <span className="text-xs text-muted/50 uppercase">{f.container}</span>
                        {f.approxSizeMB && (
                          <span className="text-xs text-muted">~{f.approxSizeMB} MB</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        disabled={downloading !== null}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                      >
                        {downloading === f.itag
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />
                        }
                        {downloading === f.itag ? 'Starting…' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
