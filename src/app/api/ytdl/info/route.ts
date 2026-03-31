import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const maxDuration = 60

function getCookieArgs(): string[] {
  const cookies = process.env.YOUTUBE_COOKIES
  if (!cookies) return []
  const cookiePath = join(tmpdir(), 'yt-cookies.txt')
  try { writeFileSync(cookiePath, cookies, 'utf8') } catch { return [] }
  return ['--cookies', cookiePath]
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
      else reject(new Error(Buffer.concat(err).toString('utf8').trim() || `yt-dlp exit ${code}`))
    })
    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)))
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
      '--extractor-args', 'youtube:player_client=ios,android,web',
      ...getCookieArgs(),
    ])

    const info = JSON.parse(raw) as Record<string, unknown>
    const allFormats = (info.formats as Record<string, unknown>[]) ?? []

    // Find max available height
    const heights = allFormats
      .map((f) => Number(f.height ?? 0))
      .filter((h) => h > 0)
    const maxHeight = heights.length ? Math.max(...heights) : 0

    // Build quality presets — only include resolutions the video actually has
    const presets = [
      { id: '4k',    label: '4K (2160p)',   height: 2160 },
      { id: '1440p', label: '1440p (2K)',    height: 1440 },
      { id: '1080p', label: '1080p HD',      height: 1080 },
      { id: '720p',  label: '720p HD',       height: 720  },
      { id: '480p',  label: '480p',          height: 480  },
      { id: '360p',  label: '360p',          height: 360  },
    ].filter((p) => maxHeight >= p.height)

    // Always add audio-only
    presets.push({ id: 'audio', label: 'Audio Only (M4A)', height: 0 })

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
      formats: presets.map((p) => ({
        itag: p.id,
        label: p.label,
        quality: p.id,
        container: p.id === 'audio' ? 'm4a' : 'mp4',
        hasVideo: p.id !== 'audio',
        hasAudio: true,
        approxSizeMB: null,
      })),
    })
  } catch (err) {
    console.error('[ytdl/info]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch video info' },
      { status: 500 }
    )
  }
}
