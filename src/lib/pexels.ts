const BASE_URL = 'https://api.pexels.com/videos'

interface PexelsVideoFile {
  quality: string
  file_type: string
  link: string
  width: number
  height: number
}

interface PexelsVideo {
  video_files: PexelsVideoFile[]
}

interface PexelsSearchResponse {
  videos: PexelsVideo[]
}

export async function searchPexelsVideoUrls(query: string, count = 3): Promise<string[]> {
  const res = await fetch(
    `${BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=portrait`,
    { headers: { Authorization: process.env.PEXELS_API_KEY! } }
  )

  if (!res.ok) throw new Error(`Pexels search failed: ${res.status} ${res.statusText}`)

  const data = (await res.json()) as PexelsSearchResponse

  if (!data.videos?.length) throw new Error(`No Pexels videos found for: ${query}`)

  return data.videos.map((video) => {
    // Prefer SD portrait to keep file sizes small and avoid OOM on Railway
    const file =
      video.video_files.find((f) => f.quality === 'sd' && f.height > f.width) ||
      video.video_files.find((f) => f.quality === 'sd') ||
      video.video_files.find((f) => f.height > f.width) ||
      video.video_files[0]
    return file.link
  })
}
