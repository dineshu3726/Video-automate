import { NextResponse } from 'next/server'
import youtubeDl from 'youtube-dl-exec'

export const maxDuration = 60

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body.url
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  try {
    const info = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
    }) as Record<string, unknown>

    const allFormats = (info.formats as Record<string, unknown>[]) ?? []

    const seen = new Set<string>()
    const formats: {
      itag: string
      quality: string
      label: string
      container: string
      hasAudio: boolean
      hasVideo: boolean
      approxSizeMB: string | null
    }[] = []

    for (const f of allFormats) {
      const formatId = String(f.format_id ?? '')
      if (!formatId || seen.has(formatId)) continue

      const vcodec = String(f.vcodec ?? 'none')
      const acodec = String(f.acodec ?? 'none')
      const hasVideo = vcodec !== 'none'
      const hasAudio = acodec !== 'none'

      // Only include combined (video+audio) and audio-only formats
      if (!hasVideo && !hasAudio) continue
      if (hasVideo && !hasAudio) continue  // skip video-only adaptive streams

      seen.add(formatId)

      const ext = String(f.ext ?? 'mp4')
      const note = String(f.format_note ?? '')
      const label = hasAudio && !hasVideo
        ? `Audio only (${note || 'medium'})`
        : note || String(f.quality ?? 'Unknown')

      const filesize = (f.filesize as number) || (f.filesize_approx as number) || null
      const sizeMB = filesize ? (filesize / 1024 / 1024).toFixed(1) : null

      formats.push({
        itag: formatId,
        quality: note || String(f.quality ?? 'unknown'),
        label,
        container: ext,
        hasAudio,
        hasVideo,
        approxSizeMB: sizeMB,
      })
    }

    // Sort: combined first, then audio-only
    formats.sort((a, b) => {
      if (a.hasVideo && !b.hasVideo) return -1
      if (!a.hasVideo && b.hasVideo) return 1
      return 0
    })

    const thumbnails = (info.thumbnails as Record<string, unknown>[]) ?? []
    const thumbnail = thumbnails.length
      ? String(thumbnails[thumbnails.length - 1].url ?? '')
      : String(info.thumbnail ?? '')

    return NextResponse.json({
      title: String(info.title ?? ''),
      author: String((info.uploader ?? info.channel) ?? ''),
      thumbnail,
      lengthSeconds: String(info.duration ?? '0'),
      viewCount: String(info.view_count ?? '0'),
      formats,
    })
  } catch (err) {
    console.error('[ytdl/info]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch video info' },
      { status: 500 }
    )
  }
}
