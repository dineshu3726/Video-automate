import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, type YouTubeToken } from '@/lib/youtube'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles').select('yt_token').eq('id', user.id).single()

    if (!profile?.yt_token) {
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 403 })
    }

    const ytToken: YouTubeToken = JSON.parse(profile.yt_token)
    const accessToken = await getValidAccessToken(ytToken, async (updated) => {
      await admin.from('profiles').update({ yt_token: JSON.stringify(updated) }).eq('id', user.id)
    })

    // Use myRating=like — more reliable than playlistId=LL
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const msg = errData?.error?.message ?? `YouTube API error ${res.status}`
      console.error('[liked] YouTube API error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const data = await res.json()

    const items = (data.items ?? []).map((item: {
      id: string
      snippet: {
        title: string
        channelTitle: string
        thumbnails?: { high?: { url: string }; medium?: { url: string } }
        publishedAt: string
      }
    }) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? '',
      publishedAt: item.snippet.publishedAt,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[liked] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
