import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'

// Prefer system ffmpeg (Railway/Linux) over the installer binary
function resolveFfmpegPath(): string {
  const systemPaths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/nix/var/nix/profiles/default/bin/ffmpeg']
  for (const p of systemPaths) {
    if (existsSync(p)) return p
  }
  return ffmpegInstaller.path
}
const FFMPEG_PATH = resolveFfmpegPath()
ffmpeg.setFfmpegPath(FFMPEG_PATH)
console.log('[videoProcessor] ffmpeg path:', FFMPEG_PATH)

function getSystemFont(): string {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/Library/Fonts/Arial.ttf',
  ]
  return candidates.find((f) => existsSync(f)) ?? ''
}

// Wraps a promise with a hard timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

async function downloadClip(url: string, destPath: string): Promise<void> {
  console.log('[videoProcessor] downloading clip:', url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`Failed to download clip: ${res.status}`)
    await writeFile(destPath, Buffer.from(await res.arrayBuffer()))
    console.log('[videoProcessor] downloaded clip to', destPath)
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

function normalizeClip(inputPath: string, outputPath: string): Promise<void> {
  console.log('[videoProcessor] normalizing', inputPath)
  return withTimeout(
    new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-t 8',
          '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 30',
          '-an',
          '-r 24',
          '-threads', '1',
        ])
        .output(outputPath)
        .on('end', () => { console.log('[videoProcessor] normalized', outputPath); resolve() })
        .on('error', (err) => reject(new Error(`Normalize error: ${err.message}`)))
        .run()
    }),
    120_000,
    'normalizeClip'
  )
}

// Cross-platform TTS using Google Translate endpoint — free, no API key
async function generateVoice(script: string, workDir: string): Promise<string | null> {
  try {
    console.log('[videoProcessor] generating TTS voice')
    const mp3Path = join(workDir, 'voice.mp3')

    const words = script.replace(/\n/g, ' ').split(' ')
    const chunks: string[] = []
    let current = ''
    for (const word of words) {
      if ((current + ' ' + word).length > 190) {
        if (current) chunks.push(current.trim())
        current = word
      } else {
        current = current ? current + ' ' + word : word
      }
    }
    if (current) chunks.push(current.trim())

    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=hi&client=tw-ob&ttsspeed=0.9`
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 5_000)
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
          signal: controller.signal,
        })
        clearTimeout(timer)
        if (!res.ok) continue
        buffers.push(Buffer.from(await res.arrayBuffer()))
      } catch {
        continue
      }
    }

    if (!buffers.length) { console.log('[videoProcessor] TTS returned no audio, skipping'); return null }

    await writeFile(mp3Path, Buffer.concat(buffers))
    console.log('[videoProcessor] TTS voice saved')
    return mp3Path
  } catch (err) {
    console.warn('[videoProcessor] TTS skipped:', err)
    return null
  }
}

export async function buildVideo(
  videoUrls: string[],
  title: string,
  script?: string
): Promise<Buffer> {
  const workDir = join('/tmp', `vf-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })
  console.log('[videoProcessor] buildVideo start, workDir:', workDir)

  try {
    // 1. Download clips in parallel
    const rawPaths = videoUrls.map((_, i) => join(workDir, `raw_${i}.mp4`))
    await withTimeout(
      Promise.all(videoUrls.map((url, i) => downloadClip(url, rawPaths[i]))),
      60_000,
      'downloadClips'
    )

    // 2. Normalize each clip
    const normPaths = videoUrls.map((_, i) => join(workDir, `norm_${i}.mp4`))
    for (let i = 0; i < rawPaths.length; i++) {
      await normalizeClip(rawPaths[i], normPaths[i])
    }

    // 3. Concat normalized clips
    console.log('[videoProcessor] concatenating clips')
    const concatFile = join(workDir, 'concat.txt')
    await writeFile(concatFile, normPaths.map((p) => `file '${p}'`).join('\n'))

    const concatPath = join(workDir, 'concat.mp4')
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFile)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions(['-c copy'])
          .output(concatPath)
          .on('end', () => { console.log('[videoProcessor] concat done'); resolve() })
          .on('error', (err) => reject(new Error(`Concat error: ${err.message}`)))
          .run()
      }),
      60_000,
      'concat'
    )

    // 4. Generate TTS voice (best-effort — skipped if unavailable)
    const voicePath = script ? await withTimeout(generateVoice(script, workDir), 30_000, 'generateVoice').catch(() => null) : null

    // 5. Final encode: title overlay + optional audio
    console.log('[videoProcessor] final encode, font:', getSystemFont())
    const outputPath = join(workDir, 'output.mp4')
    const fontPath = getSystemFont()
    const safeTitle = title
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\u2019')
      .replace(/:/g, '\\:')
      .slice(0, 60)

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg(concatPath)
        if (voicePath) cmd.input(voicePath)

        const outputOpts = [
          '-t 20',
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 30',
          '-movflags +faststart',
          '-threads', '1',
        ]
        if (voicePath) outputOpts.push('-c:a aac', '-b:a 128k', '-shortest')

        if (fontPath) {
          cmd.videoFilters(
            `drawtext=fontfile='${fontPath}':text='${safeTitle}':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-160:box=1:boxcolor=black@0.55:boxborderw=10`
          )
        }

        cmd
          .outputOptions(outputOpts)
          .output(outputPath)
          .on('end', () => { console.log('[videoProcessor] final encode done'); resolve() })
          .on('error', (err) => reject(new Error(`FFmpeg final encode error: ${err.message}`)))
          .run()
      }),
      3 * 60_000,
      'finalEncode'
    )

    const buf = await readFile(outputPath)
    console.log('[videoProcessor] video ready, size:', buf.length)
    return buf
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
