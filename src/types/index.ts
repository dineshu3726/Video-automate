export type VideoStatus =
  | 'pending'
  | 'scripting'
  | 'generating'
  | 'processing'
  | 'review'
  | 'approved'
  | 'rejected'
  | 'published'

export interface VideoJob {
  id: string
  user_id: string
  category: string
  status: VideoStatus
  script: string | null
  video_url: string | null
  thumbnail_url: string | null
  metadata: {
    title?: string
    description?: string
    tags?: string[]
    veo_prompt?: string
    veo_operation?: string        // Veo long-running operation name
    storage_path?: string         // Supabase Storage path for the raw video
    publish_urls?: {
      youtube?: string            // https://youtube.com/shorts/{id}
      instagram?: string          // https://www.instagram.com/p/{id}
    }
  } | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  yt_token: string | null
  ig_token: string | null
  created_at: string
}

export interface Settings {
  user_id: string
  post_interval: number
  preferred_time: string
}
