import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeYouTubeCode } from '@/lib/youtube'
import { getAppOrigin } from '@/lib/appUrl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getAppOrigin(request)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=youtube_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const token = await exchangeYouTubeCode(code, `${origin}/api/auth/youtube/callback`)
    const admin = createAdminClient()

    // Must include email because profiles.email is NOT NULL.
    // upsert: creates the row if missing, updates yt_token if it exists.
    const { error: dbError } = await admin
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email ?? '', yt_token: JSON.stringify(token) },
        { onConflict: 'id' }
      )

    if (dbError) throw new Error(dbError.message)

    return NextResponse.redirect(`${origin}/dashboard/settings?connected=youtube`)
  } catch (err) {
    console.error('[yt/callback]', err)
    return NextResponse.redirect(`${origin}/dashboard/settings?error=youtube_failed`)
  }
}
