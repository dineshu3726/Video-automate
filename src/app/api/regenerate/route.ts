import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateVideoContent } from '@/lib/gemini'
import { searchPexelsVideoUrls } from '@/lib/pexels'
import { buildVideo } from '@/lib/videoProcessor'

async function runVideoOnly(jobId: string, userId: string, job: Record<string, unknown>) {
  const admin = createAdminClient()
  const metadata = job.metadata as Record<string, unknown> ?? {}
  const { veo_prompt, title, tags } = metadata

  try {
    const keyword = ((tags as string[])?.[0] ?? (title as string) ?? (veo_prompt as string) ?? '').split(' ').slice(0, 3).join(' ')
    const videoUrls = await searchPexelsVideoUrls(keyword, 2)

    await admin.from('video_jobs').update({ status: 'processing' }).eq('id', jobId)
    const videoBuffer = await buildVideo(videoUrls, (title as string) ?? keyword, (job.script as string) ?? undefined)

    const storagePath = `${userId}/${jobId}.mp4`
    const { error: uploadError } = await admin.storage
      .from('videos')
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: signedData, error: signError } = await admin.storage
      .from('videos')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
    if (signError || !signedData) throw new Error('Failed to create signed URL')

    await admin
      .from('video_jobs')
      .update({
        status: 'review',
        video_url: signedData.signedUrl,
        metadata: { ...metadata, storage_path: storagePath },
      })
      .eq('id', jobId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[regenerate/video] error:', message)
    await admin
      .from('video_jobs')
      .update({ status: 'failed', metadata: { ...metadata, error: message } })
      .eq('id', jobId)
  }
}

async function runAll(jobId: string, userId: string, job: Record<string, unknown>) {
  const admin = createAdminClient()
  const metadata = job.metadata as Record<string, unknown> ?? {}

  try {
    // Re-run Gemini
    await admin.from('video_jobs').update({ status: 'scripting' }).eq('id', jobId)
    const content = await generateVideoContent(job.category as string)

    const newMetadata = {
      ...metadata,
      title: content.title,
      description: content.description,
      tags: content.tags,
      veo_prompt: content.veoPrompt,
    }

    await admin
      .from('video_jobs')
      .update({ status: 'generating', script: content.script, metadata: newMetadata })
      .eq('id', jobId)

    // Re-run video
    const keyword = (content.tags[0] ?? content.title).split(' ').slice(0, 3).join(' ')
    const videoUrls = await searchPexelsVideoUrls(keyword, 2)

    await admin.from('video_jobs').update({ status: 'processing' }).eq('id', jobId)
    const videoBuffer = await buildVideo(videoUrls, content.title, content.script)

    const storagePath = `${userId}/${jobId}.mp4`
    const { error: uploadError } = await admin.storage
      .from('videos')
      .upload(storagePath, videoBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

    const { data: signedData, error: signError } = await admin.storage
      .from('videos')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
    if (signError || !signedData) throw new Error('Failed to create signed URL')

    await admin
      .from('video_jobs')
      .update({
        status: 'review',
        video_url: signedData.signedUrl,
        metadata: { ...newMetadata, storage_path: storagePath },
      })
      .eq('id', jobId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[regenerate/all] error:', message)
    await admin
      .from('video_jobs')
      .update({ status: 'failed', metadata: { ...metadata, error: message } })
      .eq('id', jobId)
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let jobId: string
  let mode: 'video' | 'all'
  try {
    const body = await request.json()
    jobId = body.jobId
    mode = body.mode === 'all' ? 'all' : 'video'
    if (!jobId) throw new Error()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (!['review', 'failed', 'rejected'].includes(job.status)) {
    return Response.json({ error: 'Job cannot be regenerated in its current state' }, { status: 409 })
  }

  // Set initial status and fire background work
  await admin.from('video_jobs').update({ status: 'generating' }).eq('id', jobId)

  if (mode === 'all') {
    setImmediate(() => runAll(jobId, user.id, job as Record<string, unknown>))
  } else {
    setImmediate(() => runVideoOnly(jobId, user.id, job as Record<string, unknown>))
  }

  return Response.json({ started: true, mode })
}
