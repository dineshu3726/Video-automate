import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return Response.json({ error: 'Missing jobId' }, { status: 400 })

  const admin = createAdminClient()
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, status, video_url')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 })

  if (['review', 'approved', 'published'].includes(job.status)) {
    return Response.json({ done: true, videoUrl: job.video_url })
  }

  return Response.json({ done: false })
}
