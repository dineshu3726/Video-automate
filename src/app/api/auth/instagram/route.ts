import { NextResponse } from 'next/server'
import { getAppOrigin } from '@/lib/appUrl'

export async function GET(request: Request) {
  const origin = getAppOrigin(request)

  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${origin}/api/auth/instagram/callback`,
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ].join(','),
    response_type: 'code',
  })

  return NextResponse.redirect(
    `https://www.facebook.com/v20.0/dialog/oauth?${params}`
  )
}
