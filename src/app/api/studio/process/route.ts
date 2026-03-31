import { createClient } from '@/lib/supabase/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { existsSync } from 'fs'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const MAX_DURATION = 30

function resolveFfmpegPath(): string {
  const paths = ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg']
  for (const p of paths) if (existsSync(p)) return p
  return ffmpegInstaller.path
}
ffmpeg.setFfmpegPath(resolveFfmpegPath())

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let formData: FormData
  try { formData = await request.formData() }
  catch { return new Response('Invalid form data', { status: 400 }) }

  const videoFile = formData.get('video') as File | null
  if (!videoFile) return new Response('No video file', { status: 400 })

  const muteOriginal = formData.get('muteOriginal') === 'true'
  const musicFile = formData.get('music') as File | null
  const musicVolume = Math.min(Math.max(parseFloat(formData.get('musicVolume') as string) || 0.5, 0), 1)

  const workDir = join('/tmp', `studio-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const inputPath = join(workDir, 'input.webm')
    await writeFile(inputPath, Buffer.from(await videoFile.arrayBuffer()))

    let musicPath: string | null = null
    if (musicFile) {
      const ext = musicFile.name.endsWith('.mp3') ? '.mp3' : '.wav'
      musicPath = join(workDir, `music${ext}`)
      await writeFile(musicPath, Buffer.from(await musicFile.arrayBuffer()))
    }

    const outputPath = join(workDir, 'output.mp4')

    await new Promise<void>((resolve, reject) => {
      const cmd = ffmpeg(inputPath)

      // Always enforce 30s max
      cmd.duration(MAX_DURATION)

      if (musicPath) cmd.input(musicPath)

      const outputOpts: string[] = [
        '-c:v libx264', '-preset ultrafast', '-crf 26',
        '-movflags +faststart', '-threads 1',
      ]

      if (muteOriginal && musicPath) {
        // Only background music, no original audio
        outputOpts.push(
          '-map 0:v',
          `-map 1:a`,
          `-filter:a:0 volume=${musicVolume}`,
          '-c:a aac', '-b:a 128k', '-shortest',
        )
      } else if (!muteOriginal && musicPath) {
        // Mix original audio + background music
        outputOpts.push(
          '-filter_complex',
          `[0:a]volume=1.0[orig];[1:a]volume=${musicVolume}[bg];[orig][bg]amix=inputs=2:duration=shortest:dropout_transition=2[aout]`,
          '-map 0:v', '-map [aout]',
          '-c:a aac', '-b:a 128k',
        )
      } else if (muteOriginal && !musicPath) {
        // No audio at all
        outputOpts.push('-an')
      } else {
        // Keep original audio as-is
        outputOpts.push('-c:a aac', '-b:a 128k')
      }

      cmd.outputOptions(outputOpts).output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg error: ${err.message}`)))
        .run()
    })

    const outputBuffer = await readFile(outputPath)
    return new Response(outputBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="processed.mp4"',
      },
    })
  } catch (err) {
    console.error('[studio/process]', err)
    return new Response(err instanceof Error ? err.message : 'Processing failed', { status: 500 })
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }
}
