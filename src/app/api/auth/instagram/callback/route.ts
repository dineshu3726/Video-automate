import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeInstagramCode } from '@/lib/instagram'
import { getAppOrigin } from '@/lib/appUrl'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getAppOrigin(request)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=instagram_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const token = await exchangeInstagramCode(code, `${origin}/api/auth/instagram/callback`)
    const admin = createAdminClient()

    // Must include email because profiles.email is NOT NULL.
    // upsert: creates the row if missing, updates ig_token if it exists.
    const { error: dbError } = await admin
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email ?? '', ig_token: JSON.stringify(token) },
        { onConflict: 'id' }
      )

    if (dbError) throw new Error(dbError.message)

    return NextResponse.redirect(`${origin}/dashboard/settings?connected=instagram`)
  } catch (err) {
    console.error('[ig/callback]', err)
    const msg = err instanceof Error ? encodeURIComponent(err.message) : 'instagram_failed'
    return NextResponse.redirect(`${origin}/dashboard/settings?error=${msg}`)
  }
}
