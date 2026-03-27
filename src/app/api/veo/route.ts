import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { searchPexelsVideoUrls } from '@/lib/pexels'
import { buildVideo } from '@/lib/videoProcessor'

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let jobId: string
  try {
    const body = await request.json()
    jobId = body.jobId
    if (!jobId) throw new Error()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Fetch the job
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, user_id, status, metadata')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'generating') return Response.json({ error: 'Job not in generating status' }, { status: 409 })

  const { veo_prompt, title, tags } = job.metadata ?? {}
  if (!veo_prompt) return Response.json({ error: 'No video prompt found on job' }, { status: 422 })

  // Also fetch the script for voice narration
  const { data: fullJob } = await admin
    .from('video_jobs')
    .select('script')
    .eq('id', jobId)
    .single()
  const script = fullJob?.script ?? undefined

  try {
    // 4. Build search keywords from tags + title
    const keyword = (tags?.[0] ?? title ?? veo_prompt).split(' ').slice(0, 3).join(' ')

    // 5. Fetch 3 portrait stock clips from Pexels
    const videoUrls = await searchPexelsVideoUrls(keyword, 3)

    // 6. Stitch clips + voice narration + title overlay with FFmpeg
    await admin.from('video_jobs').update({ status: 'processing' }).eq('id', jobId)
    const videoBuffer = await buildVideo(videoUrls, title ?? keyword, script)

    // 7. Upload to Supabase Storage
    const storagePath = `${user.id}/${jobId}.mp4`
    const { error: uploadError } = await admin.storage
      .from('videos')
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    // 8. Create signed URL (7 days)
    const { data: signedData, error: signError } = await admin.storage
      .from('videos')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    if (signError || !signedData) throw new Error('Failed to create signed URL')

    // 9. Advance job to review
    await admin
      .from('video_jobs')
      .update({
        status: 'review',
        video_url: signedData.signedUrl,
        metadata: { ...job.metadata, storage_path: storagePath },
      })
      .eq('id', jobId)

    return Response.json({ done: true, videoUrl: signedData.signedUrl })
  } catch (err) {
    console.error('[video/generate] error:', err)
    await admin.from('video_jobs').update({ status: 'generating' }).eq('id', jobId)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Video generation failed' },
      { status: 500 }
    )
  }
}
