import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VideoJob } from '@/types'
import ReviewStation from '@/components/ReviewStation'

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { jobId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: job, error } = await supabase
    .from('video_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error || !job) notFound()

  // Only jobs in 'review' status belong on this page;
  // redirect already-decided jobs back to the dashboard
  if (!['review', 'generating', 'scripting', 'processing'].includes(job.status)) {
    redirect('/dashboard')
  }

  return <ReviewStation job={job as VideoJob} />
}
