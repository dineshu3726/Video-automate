import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateVideoContentFromUrl } from '@/lib/gemini'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let jobId: string
  let url: string
  try {
    const body = await request.json()
    jobId = body.jobId
    url = body.url
    if (!jobId || !url) throw new Error('missing fields')
    new URL(url) // validate URL format
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, user_id, status')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'pending') return Response.json({ error: 'Job already being processed' }, { status: 409 })

  await admin.from('video_jobs').update({ status: 'scripting' }).eq('id', jobId)

  try {
    const content = await generateVideoContentFromUrl(url)

    await admin
      .from('video_jobs')
      .update({
        status: 'generating',
        script: content.script,
        metadata: {
          title: content.title,
          description: content.description,
          tags: content.tags,
          veo_prompt: content.veoPrompt,
          reference_url: url,
        },
      })
      .eq('id', jobId)

    return Response.json({ success: true, jobId })
  } catch (err) {
    await admin.from('video_jobs').update({ status: 'pending' }).eq('id', jobId)
    console.error('[generate-similar] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
