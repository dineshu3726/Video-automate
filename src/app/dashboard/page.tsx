import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: jobs }, { data: profile }] = await Promise.all([
    supabase
      .from('video_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin.from('profiles').select('yt_token').eq('id', user.id).single(),
  ])

  const ytConnected = !!(profile?.yt_token)

  return (
    <DashboardClient
      user={user}
      initialJobs={jobs ?? []}
      ytConnected={ytConnected}
    />
  )
}
