import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GoogleGenAI, FileState } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

const SYSTEM_PROMPT = `You are an expert short-form video content creator specializing in monetizable YouTube Shorts and Instagram Reels for Indian audiences.
Write narration scripts in natural Hinglish — fluent Hindi sentences mixed with common English words exactly as spoken by popular Indian creators.
Keep title, description, and tags in English for SEO purposes.`

const REFERENCE_VIDEO_PROMPT = `${SYSTEM_PROMPT}

The user has uploaded a reference video. Watch it carefully — understand the topic, niche, visual style, hook technique, pacing, and tone.
Generate ORIGINAL content that is SIMILAR in niche and energy — fresh content inspired by this video's style, not a copy.

Return ONLY a valid JSON object:
{
  "script": "150–200 word Hinglish narration script. Bold Hindi hook first. Short energetic sentences. End with Hindi CTA like 'Follow karo aur aisi videos ke liye!'.",
  "veoPrompt": "Detailed visual prompt for Google Veo inspired by the uploaded video's style. Include: visual style, subjects, camera angles, color palette, lighting, motion, mood. 80–120 words.",
  "title": "SEO-optimized YouTube Short title under 60 chars with emoji.",
  "description": "YouTube/Instagram description under 150 chars with CTA.",
  "tags": ["10", "relevant", "keywords", "no", "hash", "symbol"]
}
Respond with ONLY the JSON. No markdown, no code fences.`

const AUDIO_DESCRIPTION_PROMPT = `${SYSTEM_PROMPT}

The user has recorded an audio message describing the kind of video they want to create. Listen carefully to understand:
- The topic or niche they want
- The style, tone, or mood they described
- Any specific details they mentioned

Generate video content based EXACTLY on what the user described in their audio.

Return ONLY a valid JSON object:
{
  "script": "150–200 word Hinglish narration script based on what the user described. Bold Hindi hook first. Short energetic sentences. End with Hindi CTA like 'Follow karo aur aisi videos ke liye!'.",
  "veoPrompt": "Detailed visual prompt for Google Veo matching what the user described. Include: visual style, subjects, camera angles, color palette, lighting, motion, mood. 80–120 words.",
  "title": "SEO-optimized YouTube Short title under 60 chars with emoji.",
  "description": "YouTube/Instagram description under 150 chars with CTA.",
  "tags": ["10", "relevant", "keywords", "no", "hash", "symbol"]
}
Respond with ONLY the JSON. No markdown, no code fences.`

async function waitForFileActive(fileName: string, maxWaitMs = 60_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const file = await genAI.files.get({ name: fileName })
    if (file.state === FileState.ACTIVE) return
    if (file.state === FileState.FAILED) throw new Error('Gemini file processing failed')
    await new Promise((r) => setTimeout(r, 3_000))
  }
  throw new Error('File took too long to process')
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const jobId = formData.get('jobId') as string | null
  const mode = (formData.get('mode') as string) === 'reference' ? 'reference' : 'description'

  if (!file || !jobId) return Response.json({ error: 'Missing file or jobId' }, { status: 400 })

  // Validate file type
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav']
  if (!allowed.includes(file.type)) {
    return Response.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
  }

  // Max 100MB
  if (file.size > 100 * 1024 * 1024) {
    return Response.json({ error: 'File too large (max 100MB)' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: job, error: jobError } = await admin
    .from('video_jobs')
    .select('id, user_id, status')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError || !job) return Response.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'pending') return Response.json({ error: 'Job already being processed' }, { status: 409 })

  await admin.from('video_jobs').update({ status: 'scripting' }).eq('id', jobId)

  let geminiFileName: string | undefined

  try {
    // Upload to Gemini Files API
    const blob = new Blob([await file.arrayBuffer()], { type: file.type })
    const uploaded = await genAI.files.upload({
      file: blob,
      config: { mimeType: file.type, displayName: file.name },
    })
    geminiFileName = uploaded.name

    // Wait for it to be ready
    if (!uploaded.name) throw new Error('Gemini did not return a file name')
    await waitForFileActive(uploaded.name)

    const prompt = mode === 'reference' ? REFERENCE_VIDEO_PROMPT : AUDIO_DESCRIPTION_PROMPT

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { fileData: { fileUri: uploaded.uri!, mimeType: file.type } },
          { text: prompt },
        ],
      }],
    })

    const text = (result.text ?? '').trim()
    const jsonStr = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const content = JSON.parse(jsonStr)

    await admin
      .from('video_jobs')
      .update({
        status: 'generating',
        script: content.script,
        metadata: {
          title: content.title,
          description: content.description,
          tags: content.tags,
          veo_prompt: content.veoPrompt,
          upload_mode: mode,
        },
      })
      .eq('id', jobId)

    return Response.json({ success: true, jobId })
  } catch (err) {
    await admin.from('video_jobs').update({ status: 'pending' }).eq('id', jobId)
    console.error('[generate-from-upload] error:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 }
    )
  } finally {
    // Clean up file from Gemini
    if (geminiFileName) {
      await genAI.files.delete({ name: geminiFileName }).catch(() => {})
    }
  }
}
