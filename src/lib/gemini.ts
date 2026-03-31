import { GoogleGenAI } from '@google/genai'
import { extractVideoContext } from './urlAnalyzer'

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

function buildSimilarPrompt(ctx: { platform: string; title: string; description: string; url: string }): string {
  const contextBlock = [
    `Platform: ${ctx.platform}`,
    ctx.title ? `Video Title: "${ctx.title}"` : '',
    ctx.description ? `Description: "${ctx.description}"` : '',
    `URL: ${ctx.url}`,
  ].filter(Boolean).join('\n')

  return `${SYSTEM_PROMPT}

The user wants to generate a video SIMILAR to this reference:
${contextBlock}

Study the topic, niche, tone, and style from the title and description above. Then generate ORIGINAL content that matches the same niche and energy — not a copy, but a fresh new video in the same style.

Return ONLY a valid JSON object with these exact keys:
{
  "script": "A punchy, hook-first narration script (150–200 words) in the same niche as the reference video, written in natural Hinglish — fluent Hindi with common English words mixed in, like popular Indian YouTube creators speak. Start with a bold Hindi hook. Use short, energetic sentences. End with a Hindi CTA like 'Follow karo aur aisi videos ke liye!'.",
  "veoPrompt": "A highly detailed video generation prompt for Google Veo inspired by the visual style typical for this niche. Describe: visual style, subjects, camera angles, color palette, lighting, motion, background, mood. 80–120 words.",
  "title": "An SEO-optimized YouTube Short title under 60 characters in the same niche. Include an emoji.",
  "description": "A YouTube/Instagram description under 150 characters with a call to action.",
  "tags": ["array", "of", "10", "relevant", "hashtag", "keywords", "without", "the", "hash", "symbol"]
}

Respond with ONLY the JSON. No markdown, no code fences, no extra text.`
}

export async function generateVideoContentFromUrl(url: string): Promise<GeneratedContent> {
  // Step 1: Extract real metadata from the URL
  const ctx = await extractVideoContext(url)
  const prompt = buildSimilarPrompt(ctx)

  let result
  if (ctx.platform === 'youtube') {
    // For YouTube, let Gemini watch the video directly (no mimeType — Gemini auto-detects YouTube URLs)
    // AND provide extracted metadata as text so it has rich context even if video is unavailable
    result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { fileData: { fileUri: url } },
          { text: prompt },
        ],
      }],
    }).catch(() =>
      // Fallback: text-only if video watch fails
      genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
    )
  } else {
    // Instagram/Pinterest: use extracted OG metadata as context
    result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
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
