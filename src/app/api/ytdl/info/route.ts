import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const maxDuration = 60

// Write YouTube cookies from env var to a temp file (if set)
function getCookieArgs(): string[] {
  const cookies = process.env.YOUTUBE_COOKIES
  if (!cookies) return []
  const cookiePath = join(tmpdir(), 'yt-cookies.txt')
  try {
    writeFileSync(cookiePath, cookies, 'utf8')
    return ['--cookies', cookiePath]
  } catch {
    return []
  }
}

function runYtdlp(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const out: Buffer[] = []
    const err: Buffer[] = []
    proc.stdout.on('data', (d: Buffer) => out.push(d))
    proc.stderr.on('data', (d: Buffer) => err.push(d))
    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString('utf8').trim())
      else reject(new Error(Buffer.concat(err).toString('utf8').trim() || `yt-dlp exited with code ${code}`))
    })
    proc.on('error', (e) => reject(new Error(`Failed to start yt-dlp: ${e.message}`)))
  })
}

export async function POST(request: Request) {
  let url: string
  try {
    const body = await request.json()
    url = body.url
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
  }

  try {
    const raw = await runYtdlp([
      url,
      '--dump-json',
      '--no-check-certificates',
      '--no-warnings',
      '--prefer-free-formats',
      '--extractor-args', 'youtube:player_client=android,web',
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:Mozilla/5.0',
      ...getCookieArgs(),
    ])

    const info = JSON.parse(raw) as Record<string, unknown>
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

      // Only combined (video+audio) and audio-only streams
      if (!hasVideo && !hasAudio) continue
      if (hasVideo && !hasAudio) continue

      seen.add(formatId)

      const ext = String(f.ext ?? 'mp4')
      const note = String(f.format_note ?? '')
      const label = !hasVideo
        ? `Audio only (${note || 'medium'})`
        : note || String(f.quality ?? 'Unknown')

      const filesize = (f.filesize as number) || (f.filesize_approx as number) || null
      const sizeMB = filesize ? (filesize / 1024 / 1024).toFixed(1) : null

      formats.push({ itag: formatId, quality: note, label, container: ext, hasAudio, hasVideo, approxSizeMB: sizeMB })
    }

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
