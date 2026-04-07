import { NextResponse } from 'next/server'
import { getAppOrigin } from '@/lib/appUrl'

export async function GET(request: Request) {
  const origin = getAppOrigin(request)

  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/youtube/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent', // ensures refresh_token is always returned
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
