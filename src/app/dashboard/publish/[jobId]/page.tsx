import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VideoJob } from '@/types'
import PublishStation from '@/components/PublishStation'

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function PublishPage({ params }: Props) {
  const { jobId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

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

  if (!job) notFound()
  if (!['approved', 'published'].includes(job.status)) redirect('/dashboard')

  return (
    <PublishStation
      job={job as VideoJob}
      ytConnected={!!profile?.yt_token}
      igConnected={!!profile?.ig_token}
    />
  )
}
