import { spawn } from 'child_process'
import { writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export const maxDuration = 60

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

const EXTRACTOR_ARGS = ['--extractor-args', 'youtube:player_client=ios,android,web']

function getDirectUrl(videoUrl: string, formatId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      videoUrl,
      '--get-url',
      '-f', formatId,
      '--no-check-certificates',
      '--no-warnings',
      ...EXTRACTOR_ARGS,
      '--add-header', 'referer:youtube.com',
      '--add-header', 'user-agent:Mozilla/5.0',
      ...getCookieArgs(),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

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

function getVideoTitle(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', [
      videoUrl,
      '--get-title',
      '--no-check-certificates',
      '--no-warnings',
      ...EXTRACTOR_ARGS,
      ...getCookieArgs(),
    ], { stdio: ['ignore', 'pipe', 'pipe'] })

    const out: Buffer[] = []
    proc.stdout.on('data', (d: Buffer) => out.push(d))
    proc.on('close', () => resolve(Buffer.concat(out).toString('utf8').trim()))
    proc.on('error', () => resolve('video'))
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const formatId = searchParams.get('itag') ?? 'best'

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return new Response('Invalid YouTube URL', { status: 400 })
  }

  try {
    const [directUrl, title] = await Promise.all([
      getDirectUrl(url, formatId),
      getVideoTitle(url),
    ])

    const safeTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60)
    const ext = formatId.includes('audio') ? 'webm' : 'mp4'
    const filename = `${safeTitle || 'video'}.${ext}`

    // Proxy the CDN stream so we can attach Content-Disposition
    const upstream = await fetch(directUrl, {
      headers: {
        'Referer': 'https://www.youtube.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!upstream.ok) {
      return new Response('Failed to fetch video stream', { status: 502 })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'video/mp4',
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
