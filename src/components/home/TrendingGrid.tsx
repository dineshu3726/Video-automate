'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, X, ChevronDown, Eye, Waves, ThumbsUp } from 'lucide-react'

// ── Region map ───────────────────────────────────────────────
const LOCALE_TO_REGION: Record<string, string> = {
  'en-in': 'IN', 'hi': 'IN', 'hi-in': 'IN',
  'en-us': 'US', 'en': 'US',
  'en-gb': 'GB',
  'en-au': 'AU',
  'en-ca': 'CA',
  'fr': 'FR', 'fr-fr': 'FR', 'fr-be': 'BE',
  'de': 'DE', 'de-de': 'DE', 'de-at': 'AT',
  'ja': 'JP', 'ja-jp': 'JP',
  'ko': 'KR', 'ko-kr': 'KR',
  'zh': 'CN', 'zh-cn': 'CN',
  'zh-tw': 'TW', 'zh-hk': 'HK',
  'pt': 'BR', 'pt-br': 'BR', 'pt-pt': 'PT',
  'es': 'ES', 'es-mx': 'MX', 'es-ar': 'AR',
  'es-co': 'CO', 'es-us': 'US',
  'ru': 'RU', 'ru-ru': 'RU',
  'ar': 'SA', 'ar-sa': 'SA', 'ar-eg': 'EG',
  'tr': 'TR', 'tr-tr': 'TR',
  'nl': 'NL', 'nl-nl': 'NL', 'nl-be': 'BE',
  'it': 'IT', 'it-it': 'IT',
  'pl': 'PL', 'pl-pl': 'PL',
  'vi': 'VN', 'vi-vn': 'VN',
  'th': 'TH', 'th-th': 'TH',
  'id': 'ID', 'id-id': 'ID',
  'ms': 'MY', 'ms-my': 'MY',
  'tl': 'PH', 'fil': 'PH',
  'uk': 'UA', 'uk-ua': 'UA',
  'ro': 'RO', 'ro-ro': 'RO',
  'cs': 'CZ', 'cs-cz': 'CZ',
  'hu': 'HU', 'hu-hu': 'HU',
  'sv': 'SE', 'sv-se': 'SE',
  'no': 'NO', 'nb': 'NO',
  'da': 'DK', 'da-dk': 'DK',
  'fi': 'FI', 'fi-fi': 'FI',
}

const REGION_LABELS: Record<string, string> = {
  IN: '🇮🇳 India',      US: '🇺🇸 United States', GB: '🇬🇧 United Kingdom',
  AU: '🇦🇺 Australia',  CA: '🇨🇦 Canada',         FR: '🇫🇷 France',
  DE: '🇩🇪 Germany',    JP: '🇯🇵 Japan',           KR: '🇰🇷 South Korea',
  BR: '🇧🇷 Brazil',     ES: '🇪🇸 Spain',           MX: '🇲🇽 Mexico',
  RU: '🇷🇺 Russia',     TR: '🇹🇷 Turkey',          IT: '🇮🇹 Italy',
  NL: '🇳🇱 Netherlands', PL: '🇵🇱 Poland',         ID: '🇮🇩 Indonesia',
  TH: '🇹🇭 Thailand',   VN: '🇻🇳 Vietnam',         MY: '🇲🇾 Malaysia',
  SA: '🇸🇦 Saudi Arabia', AR: '🇦🇷 Argentina',     CO: '🇨🇴 Colombia',
  TW: '🇹🇼 Taiwan',     NG: '🇳🇬 Nigeria',         ZA: '🇿🇦 South Africa',
  EG: '🇪🇬 Egypt',      PH: '🇵🇭 Philippines',     UA: '🇺🇦 Ukraine',
}

function detectRegion(): string {
  if (typeof navigator === 'undefined') return 'US'
  const langs = [...(navigator.languages ?? [navigator.language])]
  for (const lang of langs) {
    const key = lang.toLowerCase()
    if (LOCALE_TO_REGION[key]) return LOCALE_TO_REGION[key]
    const base = key.split('-')[0]
    if (LOCALE_TO_REGION[base]) return LOCALE_TO_REGION[base]
  }
  return 'US'
}

function fmtViews(n: string) {
  const num = parseInt(n)
  if (isNaN(num)) return ''
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return String(num)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d < 1) return 'Today'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

interface VideoItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  publishedAt: string
  viewCount: string
  likeCount: string
  duration: string
}

// ── Video Tile ─────────────────────────────────────────────
function VideoTile({ item, onClick }: { item: VideoItem; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group text-left w-full focus:outline-none">
      {/* Thumbnail */}
      <div className="relative rounded-xl overflow-hidden bg-surface2 aspect-video mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background:'rgba(6,15,30,0.45)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background:'rgba(201,168,76,0.9)' }}>
            <svg className="w-5 h-5 ml-0.5" fill="#060F1E" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        {item.duration && (
          <span className="absolute bottom-2 right-2 text-[11px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background:'rgba(6,15,30,0.85)', color:'#fff', letterSpacing:'0.02em' }}>
            {item.duration}
          </span>
        )}
        {/* Gold bottom border on hover */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background:'linear-gradient(90deg, #B8923A, #C9A84C, #E8C86A)' }} />
      </div>

      {/* Meta */}
      <p className="text-text text-sm font-medium leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
        {item.title}
      </p>
      <p className="text-muted text-xs mb-1 truncate">{item.channelTitle}</p>
      <div className="flex items-center gap-2 text-muted text-xs">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />{fmtViews(item.viewCount)} views
        </span>
        <span>·</span>
        <span>{timeAgo(item.publishedAt)}</span>
      </div>
    </button>
  )
}

// ── Video Modal ────────────────────────────────────────────
function VideoModal({ item, onClose }: { item: VideoItem; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:'rgba(6,15,30,0.92)', backdropFilter:'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ border:'1px solid rgba(201,168,76,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ background:'rgba(6,15,30,0.8)', border:'1px solid rgba(201,168,76,0.25)', color:'#C9A84C' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Embed */}
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="w-full h-full"
          />
        </div>

        {/* Info bar */}
        <div className="px-5 py-4" style={{ background:'#0D1B35' }}>
          <h3 className="sb-heading text-white font-semibold text-base leading-snug line-clamp-2 mb-1">
            {item.title}
          </h3>
          <div className="flex items-center gap-3 text-xs" style={{ color:'#7A95B8' }}>
            <span>{item.channelTitle}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtViews(item.viewCount)} views</span>
            <span>·</span>
            <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmtViews(item.likeCount)}</span>
            <span>·</span>
            <span>{timeAgo(item.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────
export default function TrendingGrid() {
  const [region, setRegion] = useState('US')
  const [items, setItems] = useState<VideoItem[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VideoItem | null>(null)
  const [showRegionPicker, setShowRegionPicker] = useState(false)

  // Detect region from browser locale on mount
  useEffect(() => {
    setRegion(detectRegion())
  }, [])

  const fetchVideos = useCallback(async (regionCode: string, pageToken = '', append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ region: regionCode })
      if (pageToken) params.set('pageToken', pageToken)
      const res = await fetch(`/api/trending?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load trending videos')
      if (append) {
        setItems(prev => [...prev, ...data.items])
      } else {
        setItems(data.items ?? [])
      }
      setNextPageToken(data.nextPageToken ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (region) fetchVideos(region)
  }, [region, fetchVideos])

  function changeRegion(code: string) {
    setRegion(code)
    setShowRegionPicker(false)
  }

  return (
    <>
      {/* ── Navbar ── */}
      <header className="sb-wave-border sticky top-0 z-20 border-b border-border"
        style={{ background:'rgba(13,27,53,0.95)', backdropFilter:'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg, #B8923A 0%, #C9A84C 100%)', boxShadow:'0 3px 10px rgba(201,168,76,0.4)' }}>
              <Waves className="w-4 h-4" style={{ color:'#060F1E' }} />
            </div>
            <span className="sb-heading text-white font-bold text-lg hidden sm:block">
              Video<span style={{ color:'#C9A84C' }}>Forge</span>
            </span>
          </div>

          {/* Region picker */}
          <div className="relative">
            <button
              onClick={() => setShowRegionPicker(v => !v)}
              className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition"
              style={{
                background:'rgba(201,168,76,0.08)',
                border:'1px solid rgba(201,168,76,0.2)',
                color:'#C9A84C',
              }}
            >
              <span>{REGION_LABELS[region] ?? region}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showRegionPicker && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-xl shadow-2xl overflow-hidden z-30"
                style={{
                  width: 220,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background:'#0D1B35',
                  border:'1px solid rgba(201,168,76,0.2)',
                }}
              >
                {Object.entries(REGION_LABELS).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => changeRegion(code)}
                    className="w-full text-left px-4 py-2.5 text-sm transition"
                    style={{
                      color: code === region ? '#C9A84C' : '#F0E6D0',
                      background: code === region ? 'rgba(201,168,76,0.1)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (code !== region) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { if (code !== region) e.currentTarget.style.background = 'transparent' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sign in */}
          <Link
            href="/login"
            className="sb-btn-primary px-4 py-2 rounded-lg text-xs flex-shrink-0"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ── Hero heading ── */}
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="sb-heading text-2xl font-bold text-white">
          Trending in{' '}
          <span style={{ color:'#C9A84C' }}>
            {REGION_LABELS[region] ?? region}
          </span>
        </h1>
        <p className="text-sm mt-1" style={{ color:'#7A95B8' }}>
          Most watched videos right now
        </p>
      </div>

      {/* ── Grid ── */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color:'#C9A84C' }} />
              <p className="text-sm" style={{ color:'#7A95B8' }}>Loading trending videos…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="text-sm px-5 py-3 rounded-xl" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5' }}>
              {error}
            </div>
            <button
              onClick={() => fetchVideos(region)}
              className="sb-btn-primary px-4 py-2 rounded-lg text-xs"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {items.map(item => (
                <VideoTile key={item.videoId} item={item} onClick={() => setSelected(item)} />
              ))}
            </div>

            {/* Load more */}
            {nextPageToken && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => fetchVideos(region, nextPageToken, true)}
                  disabled={loadingMore}
                  className="sb-btn-primary flex items-center gap-2 px-8 py-3 rounded-xl disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Video modal ── */}
      {selected && <VideoModal item={selected} onClose={() => setSelected(null)} />}

      {/* Close region picker on outside click */}
      {showRegionPicker && (
        <div className="fixed inset-0 z-20" onClick={() => setShowRegionPicker(false)} />
      )}
    </>
  )
}
