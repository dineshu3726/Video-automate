import { createClient } from '@/lib/supabase/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { existsSync } from 'fs'
import { writeFile, readFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

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

  const trimStart = parseFloat(formData.get('trimStart') as string) || 0
  const trimEnd = parseFloat(formData.get('trimEnd') as string) || 0
  const muteAudio = formData.get('muteAudio') === 'true'
  const swapAudioFile = formData.get('swapAudio') as File | null

  const workDir = join('/tmp', `studio-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const inputPath = join(workDir, 'input.webm')
    await writeFile(inputPath, Buffer.from(await videoFile.arrayBuffer()))

    const outputPath = join(workDir, 'output.mp4')

    // If swap audio provided, write it
    let audioPath: string | null = null
    if (swapAudioFile && !muteAudio) {
      audioPath = join(workDir, 'audio' + (swapAudioFile.name.endsWith('.mp3') ? '.mp3' : '.wav'))
      await writeFile(audioPath, Buffer.from(await swapAudioFile.arrayBuffer()))
    }

    await new Promise<void>((resolve, reject) => {
      const duration = trimEnd > trimStart ? trimEnd - trimStart : undefined
      const cmd = ffmpeg(inputPath)

      if (trimStart > 0) cmd.seekInput(trimStart)
      if (duration) cmd.duration(duration)
      if (audioPath) cmd.input(audioPath)

      const outputOpts: string[] = ['-c:v libx264', '-preset ultrafast', '-crf 26', '-movflags +faststart', '-threads 1']
      if (muteAudio) outputOpts.push('-an')
      else if (audioPath) outputOpts.push('-map 0:v', '-map 1:a', '-c:a aac', '-b:a 128k', '-shortest')
      else outputOpts.push('-c:a aac', '-b:a 128k')

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
