import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export interface GeneratedContent {
  script: string
  veoPrompt: string
  title: string
  description: string
  tags: string[]
}

const SYSTEM_PROMPT = `You are an expert short-form video content creator specializing in monetizable YouTube Shorts and Instagram Reels.
Your outputs must be optimized for maximum watch time, virality, and ad revenue potential in a 30–60 second vertical video format.
Use proven hooks like shocking facts, open loops, controversial opinions, or emotional triggers to maximize retention.
Write scripts that feel human, relatable, and keep viewers watching till the last second.`

export async function generateVideoContent(category: string): Promise<GeneratedContent> {
  const prompt = `${SYSTEM_PROMPT}

Generate content for a YouTube Short / Instagram Reel in the niche: "${category}".

Return ONLY a valid JSON object with these exact keys:
{
  "script": "A punchy, hook-first narration script (150–200 words). Start with a bold hook sentence. Use short, snappy sentences. End with a strong CTA like 'Follow for more!'.",
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
