import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let jobId: string
  let action: 'approve' | 'reject'
  let metadata: { title?: string; description?: string; tags?: string[] } | undefined
  try {
    const body = await request.json()
    jobId = body.jobId
    action = body.action
    metadata = body.metadata
    if (!jobId || !['approve', 'reject'].includes(action)) throw new Error()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 3. Verify job belongs to user and is in 'review' status
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, user_id, status, metadata')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) {
    return Response.json({ error: 'Job not found' }, { status: 404 })
  }
  if (job.status !== 'review') {
    return Response.json({ error: 'Job is not awaiting review' }, { status: 409 })
  }

  // 4. Apply action
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const updatePayload: Record<string, unknown> = { status: newStatus }

  if (action === 'approve' && metadata) {
    updatePayload.metadata = { ...job.metadata, ...metadata }
  }

  const { error: updateError } = await admin
    .from('video_jobs')
    .update(updatePayload)
    .eq('id', jobId)

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  return Response.json({ success: true, status: newStatus })
}
