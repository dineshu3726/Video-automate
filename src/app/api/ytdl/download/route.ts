import ytdl from '@distube/ytdl-core'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const itag = searchParams.get('itag')

  if (!url || !ytdl.validateURL(url)) {
    return new Response('Invalid YouTube URL', { status: 400 })
  }

  try {
    const info = await ytdl.getInfo(url)
    const format = itag
      ? ytdl.chooseFormat(info.formats, { quality: parseInt(itag) })
      : ytdl.chooseFormat(info.formats, { quality: 'highestvideo', filter: 'audioandvideo' })

    const safeTitle = info.videoDetails.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 60)

    const ext = format.container ?? 'mp4'
    const filename = `${safeTitle}.${ext}`
    const mimeType = format.mimeType?.split(';')[0] ?? 'video/mp4'

    // Stream the video directly from YouTube → browser
    const stream = ytdl.downloadFromInfo(info, { format })

    const readable = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err: Error) => controller.error(err))
      },
      cancel() {
        stream.destroy()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': mimeType,
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
