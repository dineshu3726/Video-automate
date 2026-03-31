import { NextResponse } from 'next/server'
import ytdl from '@distube/ytdl-core'

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body.url
    if (!url || !ytdl.validateURL(url)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  try {
    const info = await ytdl.getInfo(url)
    const details = info.videoDetails

    // Collect unique formats — combined (video+audio) and audio-only
    const seen = new Set<string>()
    const formats: {
      itag: number
      quality: string
      label: string
      container: string
      hasAudio: boolean
      hasVideo: boolean
      approxSizeMB: string | null
    }[] = []

    for (const f of info.formats) {
      // Skip adaptive-only streams without both audio+video UNLESS they are audio-only mp4/webm
      const isAudioOnly = !f.hasVideo && f.hasAudio
      const isCombined = f.hasVideo && f.hasAudio

      if (!isCombined && !isAudioOnly) continue
      if (!f.itag) continue

      const key = `${f.itag}`
      if (seen.has(key)) continue
      seen.add(key)

      const qualityLabel = isAudioOnly
        ? `Audio only (${f.audioQuality?.replace('AUDIO_QUALITY_', '').toLowerCase() ?? 'medium'})`
        : f.qualityLabel ?? f.quality ?? 'Unknown'

      const sizeBytes = f.contentLength ? parseInt(f.contentLength) : null
      const sizeMB = sizeBytes ? (sizeBytes / 1024 / 1024).toFixed(1) : null

      formats.push({
        itag: f.itag,
        quality: f.quality ?? 'unknown',
        label: qualityLabel,
        container: f.container ?? 'mp4',
        hasAudio: !!f.hasAudio,
        hasVideo: !!f.hasVideo,
        approxSizeMB: sizeMB,
      })
    }

    // Sort: combined formats first (by quality desc), then audio-only
    formats.sort((a, b) => {
      if (a.hasVideo && !b.hasVideo) return -1
      if (!a.hasVideo && b.hasVideo) return 1
      return 0
    })

    return NextResponse.json({
      title: details.title,
      author: details.author?.name ?? '',
      thumbnail: details.thumbnails?.at(-1)?.url ?? '',
      lengthSeconds: details.lengthSeconds,
      viewCount: details.viewCount,
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
