export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import TrendingGrid from '@/components/home/TrendingGrid'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg">
      <TrendingGrid
        user={user ? { email: user.email ?? '' } : null}
        showStudioLink={!!user}
      />
    </div>
  )
}
