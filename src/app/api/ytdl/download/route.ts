import youtubeDl from 'youtube-dl-exec'

export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const formatId = searchParams.get('itag')

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return new Response('Invalid YouTube URL', { status: 400 })
  }

  try {
    // Get the direct CDN URL for this format from yt-dlp
    const directUrl = await youtubeDl(url, {
      getUrl: true,
      format: formatId ?? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      noCheckCertificates: true,
      noWarnings: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
    }) as string

    // Get a clean filename from the video title
    const infoRaw = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      skipDownload: true,
    }) as Record<string, unknown>

    const safeTitle = String(infoRaw.title ?? 'video')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60)

    const ext = String(infoRaw.ext ?? 'mp4')
    const filename = `${safeTitle}.${ext}`

    // Proxy the stream through our server so we can set Content-Disposition
    const upstream = await fetch(directUrl.trim(), {
      headers: {
        'Referer': 'https://www.youtube.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!upstream.ok) {
      return new Response('Failed to fetch video stream', { status: 502 })
    }

    const contentType = upstream.headers.get('Content-Type') ?? 'video/mp4'

    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('[ytdl/download]', err)
    return new Response(
      err instanceof Error ? err.message : 'Download failed',
      { status: 500 }
    )
  }
}
