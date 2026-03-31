import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, type YouTubeToken } from '@/lib/youtube'

interface LikedItem {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  publishedAt: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('yt_token')
      .eq('id', user.id)
      .single()

    if (!profile?.yt_token) {
      return NextResponse.json(
        { error: 'YouTube not connected' },
        { status: 403 }
      )
    }

    const ytToken: YouTubeToken = JSON.parse(profile.yt_token)
    const accessToken = await getValidAccessToken(ytToken, async (updated) => {
      await admin
        .from('profiles')
        .update({ yt_token: JSON.stringify(updated) })
        .eq('id', user.id)
    })

    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=LL&maxResults=50',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.error?.message ?? 'Failed to fetch liked videos' },
        { status: 500 }
      )
    }

    const data = await res.json()

    const items: LikedItem[] = (data.items ?? []).map(
      (item: {
        snippet: {
          resourceId: { videoId: string }
          title: string
          videoOwnerChannelTitle: string
          thumbnails?: {
            high?: { url: string }
            medium?: { url: string }
          }
          publishedAt: string
        }
      }) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.videoOwnerChannelTitle,
        thumbnail:
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          '',
        publishedAt: item.snippet.publishedAt,
      })
    )

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[liked] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
