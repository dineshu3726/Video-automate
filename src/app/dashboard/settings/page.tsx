import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AccountSettings from '@/components/AccountSettings'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const { connected, error } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin.from('profiles').select('yt_token, ig_token').eq('id', user.id).single(),
    admin.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  return (
    <AccountSettings
      userId={user.id}
      email={user.email ?? ''}
      ytConnected={!!profile?.yt_token}
      igConnected={!!profile?.ig_token}
      postInterval={settings?.post_interval ?? 24}
      preferredTime={settings?.preferred_time ?? '09:00:00'}
      flashConnected={connected ?? null}
      flashError={error ?? null}
    />
  )
}
