import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getValidAccessToken,
  uploadToYouTube,
  type YouTubeToken,
} from '@/lib/youtube'
import {
  createReelContainer,
  waitForContainer,
  publishContainer,
  type InstagramToken,
} from '@/lib/instagram'

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let jobId: string
  let platforms: Array<'youtube' | 'instagram'>
  try {
    const body = await request.json()
    jobId = body.jobId
    platforms = body.platforms
    if (!jobId || !Array.isArray(platforms) || platforms.length === 0) throw new Error()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Fetch job + profile in parallel
  const [{ data: job }, { data: profile }] = await Promise.all([
    admin
      .from('video_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single(),
    admin
      .from('profiles')
      .select('yt_token, ig_token')
      .eq('id', user.id)
      .single(),
  ])

  if (!job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'approved') {
    return Response.json({ error: 'Job must be approved before publishing' }, { status: 409 })
  }

  const storagePath = job.metadata?.storage_path
  if (!storagePath) {
    return Response.json({ error: 'No video file found for this job' }, { status: 422 })
  }

  const title = job.metadata?.title ?? job.category
  const description = job.metadata?.description ?? ''
  const tags = job.metadata?.tags ?? []

  const publishUrls: Record<string, string> = { ...((job.metadata?.publish_urls ?? {}) as Record<string, string>) }
  const errors: Record<string, string> = {}

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (platforms.includes('youtube')) {
    if (!profile?.yt_token) {
      errors.youtube = 'YouTube account not connected'
    } else {
      try {
        const ytToken: YouTubeToken = JSON.parse(profile.yt_token)

        // Download video from Supabase Storage
        const { data: blob, error: downloadError } = await admin.storage
          .from('videos')
          .download(storagePath)
        if (downloadError || !blob) throw new Error('Failed to download video from storage')

        const videoBuffer = Buffer.from(await blob.arrayBuffer())

        // Refresh token if needed, persist updated token
        const accessToken = await getValidAccessToken(ytToken, async (updated) => {
          await admin
            .from('profiles')
            .update({ yt_token: JSON.stringify(updated) })
            .eq('id', user.id)
        })

        const videoId = await uploadToYouTube(accessToken, {
          title,
          description: `${description}\n\n${tags.map((t: string) => `#${t}`).join(' ')}`,
          tags,
          videoBuffer,
        })
        publishUrls.youtube = `https://www.youtube.com/shorts/${videoId}`
      } catch (err) {
        errors.youtube = err instanceof Error ? err.message : 'YouTube upload failed'
      }
    }
  }

  // ── Instagram ────────────────────────────────────────────────────────────
  if (platforms.includes('instagram')) {
    if (!profile?.ig_token) {
      errors.instagram = 'Instagram account not connected'
    } else {
      try {
        const igToken: InstagramToken = JSON.parse(profile.ig_token)

        // Generate a fresh 24h signed URL for Instagram to download the video
        const { data: signed } = await admin.storage
          .from('videos')
          .createSignedUrl(storagePath, 60 * 60 * 24)
        if (!signed) throw new Error('Failed to generate signed URL for Instagram')

        const caption = `${description}\n\n${tags.map((t: string) => `#${t}`).join(' ')}`
        const containerId = await createReelContainer(igToken, {
          videoUrl: signed.signedUrl,
          caption,
        })
        await waitForContainer(igToken, containerId)
        const postId = await publishContainer(igToken, containerId)
        publishUrls.instagram = `https://www.instagram.com/p/${postId}`
      } catch (err) {
        errors.instagram = err instanceof Error ? err.message : 'Instagram publish failed'
      }
    }
  }

  // ── Update job status ─────────────────────────────────────────────────────
  const anySuccess = Object.keys(publishUrls).some(
    (k) => !((job.metadata?.publish_urls as Record<string, string>)?.[k])
  )

  if (anySuccess || Object.keys(errors).length === 0) {
    await admin
      .from('video_jobs')
      .update({
        status: 'published',
        metadata: { ...job.metadata, publish_urls: publishUrls },
      })
      .eq('id', jobId)
  }

  return Response.json({
    success: Object.keys(errors).length === 0,
    publishUrls,
    errors,
  })
}
