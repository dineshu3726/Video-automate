import { spawn } from 'child_process'
import { writeFileSync, createReadStream, statSync, unlinkSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const maxDuration = 120

function getCookieArgs(): string[] {
  const cookies = process.env.YOUTUBE_COOKIES
  if (!cookies) return []
  const cookiePath = join(tmpdir(), 'yt-cookies.txt')
  // Railway stores multiline env vars with literal \n — normalize to real newlines
  const normalized = cookies.replace(/\\n/g, '\n')
  try { writeFileSync(cookiePath, normalized, 'utf8') } catch { return [] }
  return ['--cookies', cookiePath]
}

const EXTRACTOR_ARGS = ['--extractor-args', 'youtube:player_client=tv_embedded,ios,android,web']

// Map quality preset id → yt-dlp format selector
function getFormatSelector(quality: string): string {
  switch (quality) {
    case '4k':    return 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=2160]+bestaudio/best[height<=2160]'
    case '1440p': return 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1440]+bestaudio/best[height<=1440]'
    case '1080p': return 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]'
    case '720p':  return 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]'
    case '480p':  return 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]'
    case '360p':  return 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]'
    case 'audio': return 'bestaudio[ext=m4a]/bestaudio'
    default:      return 'bestvideo+bestaudio/best'
  }
}

function runYtdlpDownload(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const err: Buffer[] = []
    proc.stderr.on('data', (d: Buffer) => err.push(d))
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(Buffer.concat(err).toString('utf8').trim() || `yt-dlp exit ${code}`))
    })
    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)))
  })
}

function getVideoTitle(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const proc = spawn('yt-dlp', [
      videoUrl, '--get-title', '--no-warnings',
      ...EXTRACTOR_ARGS, ...getCookieArgs(),
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
  const quality = searchParams.get('itag') ?? '720p'

  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return new Response('Invalid YouTube URL', { status: 400 })
  }

  const isAudio = quality === 'audio'
  const ext = isAudio ? 'm4a' : 'mp4'
  const tmpFile = join(tmpdir(), `${randomUUID()}.${ext}`)

  try {
    const [, title] = await Promise.all([
      runYtdlpDownload([
        url,
        '-f', getFormatSelector(quality),
        '-o', tmpFile,
        '--merge-output-format', ext,
        '--no-check-certificates',
        '--no-warnings',
        ...EXTRACTOR_ARGS,
        ...getCookieArgs(),
      ]),
      getVideoTitle(url),
    ])

    const safeTitle = title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'video'
    const filename = `${safeTitle}_${quality}.${ext}`
    const stat = statSync(tmpFile)

    const readable = new ReadableStream({
      start(controller) {
        const stream = createReadStream(tmpFile)
        stream.on('data', (chunk) => controller.enqueue(chunk))
        stream.on('end', () => {
          controller.close()
          try { unlinkSync(tmpFile) } catch {}
        })
        stream.on('error', (err) => {
          controller.error(err)
          try { unlinkSync(tmpFile) } catch {}
        })
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': isAudio ? 'audio/mp4' : 'video/mp4',
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    if (existsSync(tmpFile)) try { unlinkSync(tmpFile) } catch {}
    console.error('[ytdl/download]', err)
    return new Response(
      err instanceof Error ? err.message : 'Download failed',
      { status: 500 }
    )
  }
}
