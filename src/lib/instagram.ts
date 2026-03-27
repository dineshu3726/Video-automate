const GRAPH = 'https://graph.facebook.com/v20.0'

export interface InstagramToken {
  access_token: string       // long-lived user token (60 days)
  ig_user_id: string         // Instagram Business Account ID
  page_access_token: string  // Page Access Token (never-expiring if subscribed)
}

/** Exchanges a short-lived code for a long-lived user token + IG account IDs. */
export async function exchangeInstagramCode(code: string): Promise<InstagramToken> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`

  // Step 1 — short-lived token
  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
    { method: 'GET' }
  )
  if (!shortRes.ok) throw new Error(`IG short token failed: ${await shortRes.text()}`)
  const { access_token: shortToken } = await shortRes.json()

  // Step 2 — long-lived user token
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: process.env.INSTAGRAM_APP_ID!,
        client_secret: process.env.INSTAGRAM_APP_SECRET!,
        fb_exchange_token: shortToken,
      })
  )
  if (!longRes.ok) throw new Error(`IG long token failed: ${await longRes.text()}`)
  const { access_token: longToken } = await longRes.json()

  // Step 3 — get Facebook Pages connected to this user
  const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longToken}`)
  if (!pagesRes.ok) throw new Error(`IG pages fetch failed: ${await pagesRes.text()}`)
  const { data: pages } = await pagesRes.json()

  if (!pages || pages.length === 0) {
    throw new Error('No Facebook Pages found. Connect an IG Business account to a Facebook Page.')
  }

  // Step 4 — find the first Page that has an Instagram Business Account
  for (const page of pages) {
    const igRes = await fetch(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()
    if (igData.instagram_business_account?.id) {
      return {
        access_token: longToken,
        ig_user_id: igData.instagram_business_account.id,
        page_access_token: page.access_token,
      }
    }
  }

  throw new Error('No Instagram Business Account found on your Facebook Pages.')
}

export interface ReelOptions {
  videoUrl: string    // publicly accessible URL (signed Supabase URL)
  caption: string     // description + formatted hashtags
}

/** Creates an IG Reels media container. Returns the container ID. */
export async function createReelContainer(
  token: InstagramToken,
  opts: ReelOptions
): Promise<string> {
  const res = await fetch(`${GRAPH}/${token.ig_user_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: opts.videoUrl,
      caption: opts.caption,
      share_to_feed: true,
      access_token: token.page_access_token,
    }),
  })
  if (!res.ok) throw new Error(`IG container creation failed: ${await res.text()}`)
  const { id } = await res.json()
  if (!id) throw new Error('IG did not return a container ID')
  return id as string
}

/** Polls a container until FINISHED or ERROR (max ~90 s). Returns true on success. */
export async function waitForContainer(
  token: InstagramToken,
  containerId: string
): Promise<void> {
  for (let i = 0; i < 18; i++) {
    await new Promise((r) => setTimeout(r, 5_000))
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${token.page_access_token}`
    )
    if (!res.ok) continue
    const { status_code } = await res.json()
    if (status_code === 'FINISHED') return
    if (status_code === 'ERROR') throw new Error('Instagram media container errored out')
  }
  throw new Error('Instagram container did not finish processing in time')
}

/** Publishes a ready container. Returns the Instagram post ID. */
export async function publishContainer(
  token: InstagramToken,
  containerId: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/${token.ig_user_id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token.page_access_token,
    }),
  })
  if (!res.ok) throw new Error(`IG publish failed: ${await res.text()}`)
  const { id } = await res.json()
  return id as string
}
