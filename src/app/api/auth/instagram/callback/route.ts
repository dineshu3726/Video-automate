import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeInstagramCode } from '@/lib/instagram'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/dashboard/settings?error=instagram_denied`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  try {
    const token = await exchangeInstagramCode(code)
    const admin = createAdminClient()

    await admin
      .from('profiles')
      .update({ ig_token: JSON.stringify(token) })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/dashboard/settings?connected=instagram`)
  } catch (err) {
    console.error('[ig/callback]', err)
    const msg = err instanceof Error ? encodeURIComponent(err.message) : 'instagram_failed'
    return NextResponse.redirect(`${origin}/dashboard/settings?error=${msg}`)
  }
}
