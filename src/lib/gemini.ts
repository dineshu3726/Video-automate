import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export interface GeneratedContent {
  script: string
  veoPrompt: string
  title: string
  description: string
  tags: string[]
}

const SYSTEM_PROMPT = `You are an expert short-form video content creator specializing in monetizable YouTube Shorts and Instagram Reels for Indian audiences.
Your outputs must be optimized for maximum watch time, virality, and ad revenue potential in a 30–60 second vertical video format.
Use proven hooks like shocking facts, open loops, controversial opinions, or emotional triggers to maximize retention.
Write narration scripts in natural Hinglish — fluent Hindi sentences mixed with common English words exactly as spoken by popular Indian creators and influencers. The script must sound like a confident, energetic Indian narrator speaking naturally.
Keep title, description, and tags in English for SEO purposes.`

const SIMILAR_VIDEO_PROMPT = (url: string) => `${SYSTEM_PROMPT}

A user has shared this reference video URL: ${url}

Analyze the video's style, tone, pacing, topic, and hook technique. Then generate ORIGINAL content that is SIMILAR in style and format but with fresh, unique content — not a copy.

Return ONLY a valid JSON object with these exact keys:
{
  "script": "A punchy, hook-first narration script (150–200 words) inspired by the reference video's style, written in natural Hinglish — fluent Hindi with common English words mixed in, exactly like popular Indian YouTube creators speak. Start with a bold Hindi hook. Use short, energetic sentences. End with a Hindi CTA like 'Follow karo aur aisi videos ke liye!'.",
  "veoPrompt": "A highly detailed video generation prompt for Google Veo inspired by the visual style of the reference video. Describe: visual style, subjects, camera angles, color palette, lighting, motion, background, mood. 80–120 words.",
  "title": "An SEO-optimized YouTube Short title under 60 characters. Include an emoji.",
  "description": "A YouTube/Instagram description under 150 characters with a call to action.",
  "tags": ["array", "of", "10", "relevant", "hashtag", "keywords", "without", "the", "hash", "symbol"]
}

Respond with ONLY the JSON. No markdown, no code fences, no extra text.`

export async function generateVideoContentFromUrl(url: string): Promise<GeneratedContent> {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')

  let result
  if (isYouTube) {
    // Gemini can directly watch YouTube videos via fileData
    result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { fileData: { fileUri: url, mimeType: 'video/mp4' } },
          { text: SIMILAR_VIDEO_PROMPT(url) },
        ],
      }],
    })
  } else {
    // For Instagram / Pinterest — pass URL as text context
    result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: SIMILAR_VIDEO_PROMPT(url),
    })
  }

  const text = (result.text ?? '').trim()
  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(jsonStr) as GeneratedContent
}

export async function generateVideoContent(category: string): Promise<GeneratedContent> {
  const prompt = `${SYSTEM_PROMPT}

Generate content for a YouTube Short / Instagram Reel in the niche: "${category}".

Return ONLY a valid JSON object with these exact keys:
{
  "script": "A punchy, hook-first narration script (150–200 words) written in natural Hinglish — fluent Hindi with common English words mixed in, exactly like popular Indian YouTube creators speak. Start with a bold Hindi hook. Use short, energetic sentences. End with a Hindi CTA like 'Follow karo aur aisi videos ke liye!'.",
  "veoPrompt": "A highly detailed video generation prompt for Google Veo. Describe: visual style (cinematic, minimalist, etc.), subjects, camera angles (close-up, drone, etc.), color palette, lighting, motion, background, and mood. Be extremely specific and visual. 80–120 words.",
  "title": "An SEO-optimized YouTube Short title under 60 characters. Include an emoji.",
  "description": "A YouTube/Instagram description under 150 characters with a call to action.",
  "tags": ["array", "of", "10", "relevant", "hashtag", "keywords", "without", "the", "hash", "symbol"]
}

Respond with ONLY the JSON. No markdown, no code fences, no extra text.`

  const result = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })
  const text = (result.text ?? '').trim()

  // Strip markdown code fences if the model adds them anyway
  const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  const parsed = JSON.parse(jsonStr) as GeneratedContent
  return parsed
}
