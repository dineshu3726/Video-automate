import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TrendingGrid from '@/components/home/TrendingGrid'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  // Guest — show trending home page with ocean background
  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(160deg, #060F1E 0%, #0A1628 40%, #0D1F3C 70%, #060F1E 100%)' }}>
      <TrendingGrid />
    </div>
  )
}
