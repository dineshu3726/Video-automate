'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Loader2, X, ChevronDown, Eye, ThumbsUp, Waves, Settings, LogOut, Clapperboard } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

// ── Region maps ───────────────────────────────────────────────────────────────
const LOCALE_TO_REGION: Record<string, string> = {
  'en-in':'IN','hi':'IN','hi-in':'IN','en-us':'US','en':'US','en-gb':'GB',
  'en-au':'AU','en-ca':'CA','fr':'FR','fr-fr':'FR','fr-be':'BE','de':'DE',
  'de-de':'DE','de-at':'AT','ja':'JP','ja-jp':'JP','ko':'KR','ko-kr':'KR',
  'zh':'CN','zh-cn':'CN','zh-tw':'TW','zh-hk':'HK','pt':'BR','pt-br':'BR',
  'pt-pt':'PT','es':'ES','es-mx':'MX','es-ar':'AR','es-co':'CO','es-us':'US',
  'ru':'RU','ru-ru':'RU','ar':'SA','ar-sa':'SA','ar-eg':'EG','tr':'TR',
  'tr-tr':'TR','nl':'NL','nl-nl':'NL','nl-be':'BE','it':'IT','it-it':'IT',
  'pl':'PL','pl-pl':'PL','vi':'VN','vi-vn':'VN','th':'TH','th-th':'TH',
  'id':'ID','id-id':'ID','ms':'MY','ms-my':'MY','tl':'PH','fil':'PH',
  'uk':'UA','uk-ua':'UA','ro':'RO','cs':'CZ','hu':'HU','sv':'SE','no':'NO',
  'nb':'NO','da':'DK','fi':'FI',
}

const REGION_LABELS: Record<string, string> = {
  IN:'🇮🇳 India', US:'🇺🇸 United States', GB:'🇬🇧 United Kingdom',
  AU:'🇦🇺 Australia', CA:'🇨🇦 Canada', FR:'🇫🇷 France',
  DE:'🇩🇪 Germany', JP:'🇯🇵 Japan', KR:'🇰🇷 South Korea',
  BR:'🇧🇷 Brazil', ES:'🇪🇸 Spain', MX:'🇲🇽 Mexico',
  RU:'🇷🇺 Russia', TR:'🇹🇷 Turkey', IT:'🇮🇹 Italy',
  NL:'🇳🇱 Netherlands', PL:'🇵🇱 Poland', ID:'🇮🇩 Indonesia',
  TH:'🇹🇭 Thailand', VN:'🇻🇳 Vietnam', MY:'🇲🇾 Malaysia',
  SA:'🇸🇦 Saudi Arabia', AR:'🇦🇷 Argentina', CO:'🇨🇴 Colombia',
  TW:'🇹🇼 Taiwan', NG:'🇳🇬 Nigeria', ZA:'🇿🇦 South Africa',
  EG:'🇪🇬 Egypt', PH:'🇵🇭 Philippines', UA:'🇺🇦 Ukraine',
}

const AVATAR_COLORS = ['#C9A84C','#14B8A6','#3B82F6','#E91E8C','#8B5CF6','#10B981','#F59E0B','#EF4444']
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }
function avatarInitial(name: string) { return (name?.[0] ?? '?').toUpperCase() }

function detectRegion(): string {
  if (typeof navigator === 'undefined') return 'US'
  for (const lang of [...(navigator.languages ?? [navigator.language])]) {
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
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return 'Today'
  if (d < 7) return `${d} days ago`
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`
  if (d < 365) return `${Math.floor(d / 30)} months ago`
  return `${Math.floor(d / 365)} years ago`
}

export interface VideoItem {
  videoId: string
  token: string          // AES-encrypted videoId — used for proxy stream URL
  title: string
  channelTitle: string
  thumbnail: string
  publishedAt: string
  viewCount: string
  likeCount: string
  duration: string
}

// ── YouTube-style video tile ───────────────────────────────────────────────────
function VideoTile({ item, onClick }: { item: VideoItem; onClick: () => void }) {
  const color = avatarColor(item.channelTitle)
  const initial = avatarInitial(item.channelTitle)
  return (
    <button onClick={onClick} className="group text-left w-full focus:outline-none">
      {/* 16:9 Thumbnail */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3"
        style={{ background:'#1a2744' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.thumbnail} alt={item.title} loading="lazy"
          className="w-full h-full object-cover group-hover:rounded-none transition-all duration-200" />
        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.3)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:'rgba(201,168,76,0.92)', boxShadow:'0 0 24px rgba(201,168,76,0.5)' }}>
            <svg className="w-6 h-6 ml-1" fill="#060F1E" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        {/* Duration badge */}
        {item.duration && (
          <span className="absolute bottom-1.5 right-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded"
            style={{ background:'rgba(0,0,0,0.85)', color:'#fff' }}>
            {item.duration}
          </span>
        )}
      </div>

      {/* Meta row: channel avatar + text */}
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: color, color:'#fff' }}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors"
            style={{ color:'#F0E6D0' }}>
            {item.title}
          </p>
          <p className="text-xs truncate" style={{ color:'#7A95B8' }}>{item.channelTitle}</p>
          <p className="text-xs mt-0.5" style={{ color:'#7A95B8' }}>
            {fmtViews(item.viewCount)} views · {timeAgo(item.publishedAt)}
          </p>
        </div>
      </div>
    </button>
  )
}

// ── YouTube-like watch overlay ────────────────────────────────────────────────
function WatchOverlay({ item, related, onClose }: { item: VideoItem; related: VideoItem[]; onClose: () => void }) {
  const [current, setCurrent] = useState(item)

  useEffect(() => { setCurrent(item) }, [item])

  // Mask browser address bar — push encrypted token URL so real video ID is hidden
  useEffect(() => {
    const prev = window.location.href
    window.history.pushState(null, '', `/watch/${current.token}`)
    return () => { window.history.replaceState(null, '', prev) }
  }, [current.token])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const relatedVideos = related.filter(v => v.videoId !== current.videoId).slice(0, 12)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background:'#0f0f0f' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 h-12 flex items-center px-4 gap-3"
        style={{ background:'rgba(15,15,15,0.95)', backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onClose}
          className="flex items-center gap-2 text-sm transition"
          style={{ color:'rgba(255,255,255,0.55)' }}
          onMouseEnter={e => (e.currentTarget.style.color='#C9A84C')}
          onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,0.55)')}>
          <X className="w-4 h-4" /> Close
        </button>
        <span className="flex-1" />
        <span className="sb-heading text-white font-bold text-base hidden sm:block">
          Vyb<span style={{ color:'#C9A84C' }}>eline</span>
        </span>
        <span className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-[1600px] mx-auto">

        {/* ── Main player column ── */}
        <div className="flex-1 min-w-0">
          {/* Video player with branding overlays */}
          <div className="w-full aspect-video rounded-xl overflow-hidden relative"
            style={{ background:'#000' }}>
            <iframe
              key={current.videoId}
              src={`https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3`}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
              allowFullScreen
              className="w-full h-full"
            />
            {/* ── Branding mask overlays (pointer-events:none so controls still work) ── */}
            {/* Top-right YouTube watermark */}
            <div className="absolute top-2 right-2 w-24 h-7 rounded pointer-events-none" style={{ background:'#000' }} />
            {/* Bottom-right "Watch on YouTube" in control bar */}
            <div className="absolute bottom-0 right-0 w-52 h-11 pointer-events-none" style={{ background:'#000' }} />
            {/* Top-left channel name flash */}
            <div className="absolute top-2 left-2 w-56 h-7 rounded pointer-events-none" style={{ background:'#000' }} />
          </div>

          {/* Video info */}
          <div className="mt-4">
            <h1 className="sb-heading text-white font-bold text-lg leading-snug mb-3">
              {current.title}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: avatarColor(current.channelTitle), color:'#fff' }}>
                  {avatarInitial(current.channelTitle)}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color:'#F0E6D0' }}>{current.channelTitle}</p>
                  <p className="text-xs" style={{ color:'#7A95B8' }}>{timeAgo(current.publishedAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm" style={{ color:'#7A95B8' }}>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />{fmtViews(current.viewCount)} views
                </span>
                <span className="flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4" />{fmtViews(current.likeCount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Related videos sidebar ── */}
        <div className="lg:w-[360px] flex-shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color:'#7A95B8' }}>
            Up next
          </p>
          <div className="space-y-3">
            {relatedVideos.map(v => (
              <button key={v.videoId} onClick={() => setCurrent(v)}
                className="flex gap-3 w-full text-left group focus:outline-none">
                {/* Thumbnail */}
                <div className="relative flex-shrink-0 w-[168px] aspect-video rounded-lg overflow-hidden"
                  style={{ background:'#1a2744' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} loading="lazy"
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                  {v.duration && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-bold px-1 py-0.5 rounded"
                      style={{ background:'rgba(0,0,0,0.85)', color:'#fff' }}>
                      {v.duration}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors"
                    style={{ color: v.videoId === current.videoId ? '#C9A84C' : '#F0E6D0' }}>
                    {v.title}
                  </p>
                  <p className="text-[11px]" style={{ color:'#7A95B8' }}>{v.channelTitle}</p>
                  <p className="text-[11px]" style={{ color:'#7A95B8' }}>{fmtViews(v.viewCount)} views</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  user?: { email: string } | null
  showStudioLink?: boolean
}

export default function TrendingGrid({ user = null, showStudioLink = false }: Props) {
  const [region, setRegion] = useState('US')
  const [items, setItems] = useState<VideoItem[]>([])
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<VideoItem | null>(null)
  const [showRegionPicker, setShowRegionPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setRegion(detectRegion()) }, [])

  const fetchVideos = useCallback(async (regionCode: string, pageToken = '', append = false) => {
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ region: regionCode })
      if (pageToken) params.set('pageToken', pageToken)
      const res = await fetch(`/api/trending?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load trending videos')
      append ? setItems(prev => [...prev, ...data.items]) : setItems(data.items ?? [])
      setNextPageToken(data.nextPageToken ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally { setLoading(false); setLoadingMore(false) }
  }, [])

  useEffect(() => { if (region) fetchVideos(region) }, [region, fetchVideos])

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowRegionPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {/* ── Navbar ── */}
      <header className="sb-wave-border sticky top-0 z-20 border-b border-border"
        style={{ background:'rgba(9,18,40,0.97)', backdropFilter:'blur(20px)' }}>
        <div className="w-full px-4 sm:px-6 h-14 flex items-center gap-4">

          {/* LEFT: ThemeToggle + Region picker + Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <ThemeToggle />
            {/* Region picker */}
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setShowRegionPicker(v => !v)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition"
                style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.18)', color:'#C9A84C' }}
              >
                <span className="max-w-[130px] truncate">{REGION_LABELS[region] ?? region}</span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${showRegionPicker ? 'rotate-180' : ''}`} />
              </button>

              {showRegionPicker && (
                <div className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl z-30"
                  style={{ width:220, maxHeight:300, overflowY:'auto', background:'#0D1B35', border:'1px solid rgba(201,168,76,0.2)' }}>
                  {Object.entries(REGION_LABELS).map(([code, label]) => (
                    <button key={code} onClick={() => { setRegion(code); setShowRegionPicker(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm"
                      style={{ color: code === region ? '#C9A84C' : '#F0E6D0', background: code === region ? 'rgba(201,168,76,0.1)' : 'transparent' }}
                      onMouseEnter={e => { if (code !== region) e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (code !== region) e.currentTarget.style.background='transparent' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background:'linear-gradient(135deg,#B8923A,#C9A84C)', boxShadow:'0 2px 8px rgba(201,168,76,0.4)' }}>
                <Waves className="w-3.5 h-3.5" style={{ color:'#060F1E' }} />
              </div>
              <span className="sb-heading text-white font-bold text-base hidden sm:block">
                Vyb<span style={{ color:'#C9A84C' }}>eline</span>
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* RIGHT: Studio + user or Sign In */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user ? (
              <>
                {showStudioLink && (
                  <Link href="/dashboard"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    style={{ color:'#C9A84C', border:'1px solid rgba(201,168,76,0.2)', background:'rgba(201,168,76,0.06)' }}>
                    <Clapperboard className="w-3.5 h-3.5" /> Studio
                  </Link>
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background:'linear-gradient(135deg,#B8923A,#C9A84C)', color:'#060F1E' }}>
                  {user.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
              </>
            ) : (
              <Link href="/login" className="sb-btn-primary px-4 py-2 rounded-lg text-xs flex-shrink-0">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Heading ── */}
      <div className="w-full px-4 sm:px-6 pt-6 pb-3">
        <h1 className="sb-heading text-xl font-bold text-white">
          Trending in <span style={{ color:'#C9A84C' }}>{REGION_LABELS[region] ?? region}</span>
        </h1>
      </div>

      {/* ── Grid ── */}
      <main className="w-full px-4 sm:px-6 pb-16">

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color:'#C9A84C' }} />
            <p className="text-sm" style={{ color:'#7A95B8' }}>Loading trending videos…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.15)' }}>
              <Waves className="w-7 h-7" style={{ color:'#C9A84C' }} />
            </div>
            <div>
              <p className="sb-heading text-white font-semibold mb-1">Couldn't load trending videos</p>
              <p className="text-sm max-w-xs" style={{ color:'#7A95B8' }}>
                {error.includes('not configured')
                  ? 'Add YOUTUBE_DATA_API_KEY to your environment variables to enable trending videos.'
                  : error}
              </p>
            </div>
            <button onClick={() => fetchVideos(region)} className="sb-btn-primary px-5 py-2.5 rounded-xl text-xs">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            {/* YouTube-style grid — full width, tight gaps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-7">
              {items.map(item => (
                <VideoTile key={item.videoId} item={item} onClick={() => setSelected(item)} />
              ))}
            </div>

            {nextPageToken && (
              <div className="flex justify-center mt-12">
                <button onClick={() => fetchVideos(region, nextPageToken, true)}
                  disabled={loadingMore}
                  className="sb-btn-primary flex items-center gap-2 px-8 py-3 rounded-xl disabled:opacity-50">
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? 'Loading…' : 'Show more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Watch overlay ── */}
      {selected && (
        <WatchOverlay item={selected} related={items} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
