import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, uploadToYouTube, type YouTubeToken } from '@/lib/youtube'

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('yt_token').eq('id', user.id).single()
  if (!profile?.yt_token) return Response.json({ error: 'YouTube account not connected' }, { status: 403 })

  let formData: FormData
  try { formData = await request.formData() }
  catch { return Response.json({ error: 'Invalid form data' }, { status: 400 }) }

  const videoFile = formData.get('video') as File | null
  if (!videoFile) return Response.json({ error: 'No video file' }, { status: 400 })

  if (videoFile.size > 100 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 100MB for 30s video)' }, { status: 400 })
  }

  const title = (formData.get('title') as string) || 'Untitled Video'
  const description = (formData.get('description') as string) || ''
  const tagsStr = (formData.get('tags') as string) || ''
  const privacyStatus = ((formData.get('privacyStatus') as string) || 'public') as 'public' | 'unlisted' | 'private'
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : []

  try {
    const ytToken: YouTubeToken = JSON.parse(profile.yt_token)
    const accessToken = await getValidAccessToken(ytToken, async updated => {
      await admin.from('profiles').update({ yt_token: JSON.stringify(updated) }).eq('id', user.id)
    })

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())
    const videoId = await uploadToYouTube(accessToken, {
      title,
      description: `${description}\n\n${tags.map(t => `#${t}`).join(' ')}`.trim(),
      tags,
      videoBuffer,
      privacyStatus,
    })

    return Response.json({ success: true, videoId, url: `https://www.youtube.com/watch?v=${videoId}` })
  } catch (err) {
    console.error('[studio/upload]', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 })
  }
}
