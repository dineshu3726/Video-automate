import { NextResponse } from 'next/server'

const VALID_REGIONS = new Set([
  'IN','US','GB','AU','CA','FR','DE','JP','KR','BR','ES','MX','RU',
  'TR','IT','NL','PL','ID','TH','VN','MY','SA','AR','CO','TW','NG',
  'ZA','EG','PH','PK','BD','UA','RO','CZ','HU','SE','NO','DK','FI',
])

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
  const raw = (searchParams.get('region') ?? 'US').toUpperCase()
  const regionCode = VALID_REGIONS.has(raw) ? raw : 'US'
  const pageToken = searchParams.get('pageToken') ?? ''

  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'YOUTUBE_DATA_API_KEY not configured' }, { status: 500 })
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet,statistics,contentDetails')
  url.searchParams.set('chart', 'mostPopular')
  url.searchParams.set('regionCode', regionCode)
  url.searchParams.set('maxResults', '24')
  url.searchParams.set('key', apiKey)
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // cache 5 min
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `YouTube API error: ${text}` }, { status: res.status })
  }

  const data = await res.json()

  const items = (data.items ?? []).map((v: any) => ({
    videoId: v.id,
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
    categoryId: v.snippet.categoryId,
  }))

  return NextResponse.json({
    items,
    nextPageToken: data.nextPageToken ?? null,
    regionCode,
  })
}
