import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeYouTubeCode } from '@/lib/youtube'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=youtube_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const token = await exchangeYouTubeCode(code)
    const admin = createAdminClient()

    await admin
      .from('profiles')
      .update({ yt_token: JSON.stringify(token) })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/dashboard/settings?connected=youtube`)
  } catch (err) {
    console.error('[yt/callback]', err)
    return NextResponse.redirect(`${origin}/dashboard/settings?error=youtube_failed`)
  }
}
