import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, type YouTubeToken } from '@/lib/youtube'

interface YouTubeFeedItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  viewCount: string
  publishedAt: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('yt_token').eq('id', user.id).single()
  if (!profile?.yt_token) return NextResponse.json({ error: 'YouTube not connected' }, { status: 403 })

  const ytToken: YouTubeToken = JSON.parse(profile.yt_token)
  const accessToken = await getValidAccessToken(ytToken, async (updated) => {
    await admin.from('profiles').update({ yt_token: JSON.stringify(updated) }).eq('id', user.id)
  })

  // 1. Get subscriptions (up to 50)
  const subRes = await fetch(
    'https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!subRes.ok) return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  const subData = await subRes.json()
  const channelIds: string[] = (subData.items ?? []).map((item: { snippet: { resourceId: { channelId: string } } }) => item.snippet.resourceId.channelId)

  if (!channelIds.length) return NextResponse.json({ items: [] })

  // 2. Search for short videos from subscribed channels (use first 8 channels to save quota)
  const sampleChannels = channelIds.slice(0, 8).join(',')
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${sampleChannels}&type=video&videoDuration=short&order=date&maxResults=40&safeSearch=none`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  let items: YouTubeFeedItem[] = []

  if (searchRes.ok) {
    const searchData = await searchRes.json()
    const videoIds = (searchData.items ?? []).map((i: { id: { videoId: string } }) => i.id.videoId).filter(Boolean).join(',')

    // 3. Get view counts
    let viewMap: Record<string, string> = {}
    if (videoIds) {
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        viewMap = Object.fromEntries((statsData.items ?? []).map((v: { id: string; statistics: { viewCount: string } }) => [v.id, v.statistics.viewCount ?? '0']))
      }
    }

    items = (searchData.items ?? [])
      .filter((i: { id: { videoId: string } }) => i.id.videoId)
      .map((i: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { high?: { url: string }; medium?: { url: string } }; publishedAt: string } }) => ({
        videoId: i.id.videoId,
        title: i.snippet.title,
        channelTitle: i.snippet.channelTitle,
        thumbnail: i.snippet.thumbnails?.high?.url ?? i.snippet.thumbnails?.medium?.url ?? '',
        viewCount: viewMap[i.id.videoId] ?? '0',
        publishedAt: i.snippet.publishedAt,
      }))
  }

  return NextResponse.json({ items })
}
