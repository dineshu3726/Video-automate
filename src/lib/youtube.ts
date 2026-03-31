export interface YouTubeToken {
  access_token: string
  refresh_token: string
  expiry_date: number   // ms epoch
  scope: string
}

/** Exchanges an auth code for YouTube tokens. */
export async function exchangeYouTubeCode(code: string): Promise<YouTubeToken> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`)
  const data = await res.json()
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  }
}

/** Returns a valid access token, refreshing it first if expired. */
export async function getValidAccessToken(
  token: YouTubeToken,
  onRefreshed: (updated: YouTubeToken) => Promise<void>
): Promise<string> {
  if (Date.now() < token.expiry_date - 60_000) return token.access_token

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${await res.text()}`)
  const data = await res.json()

  const updated: YouTubeToken = {
    ...token,
    access_token: data.access_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
  await onRefreshed(updated)
  return updated.access_token
}

export interface UploadOptions {
  title: string
  description: string
  tags: string[]
  videoBuffer: Buffer
  mimeType?: string
  privacyStatus?: 'public' | 'unlisted' | 'private'
}

/**
 * Uploads a video to YouTube using the two-step resumable upload protocol.
 * Returns the YouTube video ID.
 */
export async function uploadToYouTube(
  accessToken: string,
  opts: UploadOptions
): Promise<string> {
  const { title, description, tags, videoBuffer, mimeType = 'video/mp4', privacyStatus = 'public' } = opts

  // Step 1 — Initiate resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType,
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({
        snippet: {
          title,
          description,
          tags,
          categoryId: '22', // People & Blogs — YouTube auto-promotes 9:16 as Shorts
        },
        status: { privacyStatus, selfDeclaredMadeForKids: false },
      }),
    }
  )

  if (!initRes.ok) {
    throw new Error(`YouTube upload initiation failed: ${await initRes.text()}`)
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL')

  // Step 2 — Upload the video bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
      'Content-Length': String(videoBuffer.length),
    },
    // Convert Buffer to Uint8Array for fetch compatibility
    body: new Uint8Array(videoBuffer),
  })

  if (!uploadRes.ok) {
    throw new Error(`YouTube video upload failed: ${await uploadRes.text()}`)
  }

  const video = await uploadRes.json()
  return video.id as string
}
