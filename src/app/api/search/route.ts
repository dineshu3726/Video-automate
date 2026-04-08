import { NextResponse } from 'next/server'
import { encodeVideoId } from '@/lib/videoToken'

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const s = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${min}:${String(s).padStart(2,'0')}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'YOUTUBE_DATA_API_KEY not configured' }, { status: 500 })

  // Step 1: search for video IDs
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', q)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('maxResults', '24')
  searchUrl.searchParams.set('order', 'relevance')
  searchUrl.searchParams.set('key', apiKey)

  const searchRes = await fetch(searchUrl.toString())
  if (!searchRes.ok) {
    const text = await searchRes.text()
    return NextResponse.json({ error: `YouTube API error: ${text}` }, { status: searchRes.status })
  }
  const searchData = await searchRes.json()
  const ids: string[] = (searchData.items ?? []).map((i: any) => i.id.videoId).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ items: [] })

  // Step 2: fetch stats + duration for those IDs
  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  videosUrl.searchParams.set('part', 'snippet,statistics,contentDetails')
  videosUrl.searchParams.set('id', ids.join(','))
  videosUrl.searchParams.set('key', apiKey)

  const videosRes = await fetch(videosUrl.toString())
  if (!videosRes.ok) {
    const text = await videosRes.text()
    return NextResponse.json({ error: `YouTube API error: ${text}` }, { status: videosRes.status })
  }
  const videosData = await videosRes.json()

  const items = (videosData.items ?? []).map((v: any) => ({
    videoId: v.id,
    token: encodeVideoId(v.id),
    title: v.snippet.title,
    channelTitle: v.snippet.channelTitle,
    thumbnail: v.snippet.thumbnails?.maxres?.url
      ?? v.snippet.thumbnails?.high?.url
      ?? v.snippet.thumbnails?.medium?.url
      ?? '',
    publishedAt: v.snippet.publishedAt,
    viewCount: v.statistics?.viewCount ?? '0',
    likeCount: v.statistics?.likeCount ?? '0',
    duration: parseDuration(v.contentDetails?.duration ?? ''),
  }))

  return NextResponse.json({ items })
}
