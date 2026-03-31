export interface VideoContext {
  platform: 'youtube' | 'instagram' | 'pinterest' | 'unknown'
  title: string
  description: string
  url: string
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
    /embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function fetchYouTubeContext(url: string): Promise<{ title: string; description: string }> {
  try {
    // YouTube oEmbed — no API key needed, always public
    const videoId = extractYouTubeId(url)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(oembedUrl, { signal: controller.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = await res.json()
      return {
        title: data.title ?? '',
        description: `YouTube video by ${data.author_name ?? 'unknown'}${videoId ? ` (ID: ${videoId})` : ''}`,
      }
    }
  } catch { /* fall through */ }
  return { title: '', description: '' }
}

async function fetchOpenGraphContext(url: string): Promise<{ title: string; description: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Accept: 'text/html',
      },
    })
    clearTimeout(timer)
    if (!res.ok) return { title: '', description: '' }

    const html = await res.text()

    const getTag = (property: string): string => {
      const match =
        html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
      return match?.[1] ?? ''
    }

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return {
      title: getTag('title') || titleTag?.[1] || '',
      description: getTag('description') || '',
    }
  } catch {
    return { title: '', description: '' }
  }
}

export async function extractVideoContext(url: string): Promise<VideoContext> {
  const lower = url.toLowerCase()

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const { title, description } = await fetchYouTubeContext(url)
    return { platform: 'youtube', title, description, url }
  }

  if (lower.includes('instagram.com')) {
    const { title, description } = await fetchOpenGraphContext(url)
    return { platform: 'instagram', title, description, url }
  }

  if (lower.includes('pinterest.com') || lower.includes('pin.it')) {
    const { title, description } = await fetchOpenGraphContext(url)
    return { platform: 'pinterest', title, description, url }
  }

  const { title, description } = await fetchOpenGraphContext(url)
  return { platform: 'unknown', title, description, url }
}
