import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateVideoContent } from '@/lib/gemini'

export async function POST(request: Request) {
  // 1. Verify the calling user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse request body
  let jobId: string
  let category: string
  try {
    const body = await request.json()
    jobId = body.jobId
    category = body.category
    if (!jobId || !category) throw new Error('missing fields')
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Verify the job belongs to this user
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, user_id, status')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.status !== 'pending') {
    return Response.json({ error: 'Job already being processed' }, { status: 409 })
  }

  // 4. Mark job as scripting
  await admin
    .from('video_jobs')
    .update({ status: 'scripting' })
    .eq('id', jobId)

  try {
    // 5. Call Gemini to generate script + video prompt
    const content = await generateVideoContent(category)

    // 6. Store results and advance to 'generating' (ready for Veo in Phase 3)
    const { error: updateError } = await admin
      .from('video_jobs')
      .update({
        status: 'generating',
        script: content.script,
        metadata: {
          title: content.title,
          description: content.description,
          tags: content.tags,
          veo_prompt: content.veoPrompt,
        },
      })
      .eq('id', jobId)

    if (updateError) throw updateError

    return Response.json({ success: true, jobId })
  } catch (err) {
    // On any error, revert the job to pending so it can be retried
    await admin
      .from('video_jobs')
      .update({ status: 'pending' })
      .eq('id', jobId)

    console.error('[generate] error:', err)
    const msg = err instanceof Error ? err.message : 'Generation failed'
    const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')
    return Response.json(
      { error: isOverloaded ? 'AI model is busy right now. Please try again in a moment.' : msg },
      { status: isOverloaded ? 503 : 500 }
    )
  }
}
