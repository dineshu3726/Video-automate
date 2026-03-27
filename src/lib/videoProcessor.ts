import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

function getSystemFont(): string {
  const candidates = [
    // macOS
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
    // Linux (Railway/Render)
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
  ]
  return candidates.find((f) => existsSync(f)) ?? ''
}

async function downloadClip(url: string, destPath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download clip: ${res.status}`)
  await writeFile(destPath, Buffer.from(await res.arrayBuffer()))
}

function normalizeClip(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-t 10',
        '-vf scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-c:v libx264',
        '-preset fast',
        '-crf 28',
        '-an',
        '-r 30',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`Normalize error: ${err.message}`)))
      .run()
  })
}

// Cross-platform TTS using Google Translate endpoint — free, no API key
async function generateVoice(script: string, workDir: string): Promise<string | null> {
  try {
    const mp3Path = join(workDir, 'voice.mp3')

    // Split into 200-char chunks (Google TTS limit per request)
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

    // Fetch each chunk and combine
    const buffers: Buffer[] = []
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=en&client=tw-ob&ttsspeed=0.9`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      })
      if (!res.ok) continue
      buffers.push(Buffer.from(await res.arrayBuffer()))
    }

    if (!buffers.length) return null

    // Write combined MP3
    await writeFile(mp3Path, Buffer.concat(buffers))
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

  try {
    // 1. Download clips in parallel
    const rawPaths = videoUrls.map((_, i) => join(workDir, `raw_${i}.mp4`))
    await Promise.all(videoUrls.map((url, i) => downloadClip(url, rawPaths[i])))

    // 2. Normalize each clip
    const normPaths = videoUrls.map((_, i) => join(workDir, `norm_${i}.mp4`))
    for (let i = 0; i < rawPaths.length; i++) {
      await normalizeClip(rawPaths[i], normPaths[i])
    }

    // 3. Concat normalized clips
    const concatFile = join(workDir, 'concat.txt')
    await writeFile(concatFile, normPaths.map((p) => `file '${p}'`).join('\n'))

    const concatPath = join(workDir, 'concat.mp4')
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFile)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .output(concatPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Concat error: ${err.message}`)))
        .run()
    })

    // 4. Generate cross-platform TTS voice
    const voicePath = script ? await generateVoice(script, workDir) : null

    // 5. Add title overlay + mix audio
    const outputPath = join(workDir, 'output.mp4')
    const fontPath = getSystemFont()
    const safeTitle = title
      .replace(/\\/g, '\\\\')
      .replace(/'/g, '\u2019')
      .replace(/:/g, '\\:')
      .slice(0, 60)

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(concatPath)
      if (voicePath) cmd.input(voicePath)

      const outputOpts = [
        '-t 30',
        '-c:v libx264',
        '-preset fast',
        '-crf 26',
        '-movflags +faststart',
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
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run()
    })

    return await readFile(outputPath)
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
