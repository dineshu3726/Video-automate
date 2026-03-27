import { GoogleGenAI, GenerateVideosOperation } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export type VeoPollResult =
  | { done: false }
  | { done: true; videoBytes: string; mimeType: string }
  | { done: true; videoUri: string; mimeType: string }

/**
 * Submits a Veo video generation request and returns the operation name.
 * The operation name is persisted in the DB so we can poll it later.
 */
export async function startVeoGeneration(veoPrompt: string): Promise<string> {
  const operation = await ai.models.generateVideos({
    model: 'veo-2.0-generate-001',
    prompt: veoPrompt,
    config: {
      aspectRatio: '9:16',
      durationSeconds: 8,
      numberOfVideos: 1,
    },
  })

  if (!operation.name) throw new Error('Veo did not return an operation name')
  return operation.name
}

/**
 * Polls a Veo operation by name.
 * Returns { done: false } if still running, or { done: true, videoBytes, mimeType } when complete.
 */
export async function pollVeoOperation(operationName: string): Promise<VeoPollResult> {
  const op = new GenerateVideosOperation()
  op.name = operationName
  const operation = await ai.operations.getVideosOperation({ operation: op })

  if (!operation.done) return { done: false }

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) throw new Error('Veo completed but returned no video')

  if (video.videoBytes) {
    return { done: true, videoBytes: video.videoBytes, mimeType: 'video/mp4' }
  }

  if (video.uri) {
    return { done: true, videoUri: video.uri, mimeType: 'video/mp4' }
  }

  throw new Error('Veo video has no bytes or URI')
}
