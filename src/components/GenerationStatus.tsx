'use client'

import { VideoStatus } from '@/types'
import { Check, Loader2, Clock, FileText, Video, Cpu } from 'lucide-react'

interface Step {
  status: VideoStatus
  label: string
  description: string
  icon: React.ReactNode
}

const PIPELINE_STEPS: Step[] = [
  {
    status: 'scripting',
    label: 'Writing Script',
    description: 'Gemini is crafting your hook, narration, and CTA',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    status: 'generating',
    label: 'Generating Video',
    description: 'Veo is rendering your cinematic Short',
    icon: <Video className="w-4 h-4" />,
  },
  {
    status: 'processing',
    label: 'Processing',
    description: 'FFmpeg is adding captions and overlays',
    icon: <Cpu className="w-4 h-4" />,
  },
]

const STATUS_ORDER: VideoStatus[] = ['pending', 'scripting', 'generating', 'processing', 'review']

function getStepState(
  stepStatus: VideoStatus,
  currentStatus: VideoStatus
): 'complete' | 'active' | 'upcoming' {
  const stepIndex = STATUS_ORDER.indexOf(stepStatus)
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)
  if (currentIndex > stepIndex) return 'complete'
  if (currentIndex === stepIndex) return 'active'
  return 'upcoming'
}

interface Props {
  status: VideoStatus
  jobId: string
}

export default function GenerationStatus({ status, jobId }: Props) {
  if (!['scripting', 'generating', 'processing'].includes(status)) return null

  return (
    <div className="bg-gray-900 border border-violet-900/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
        <span className="text-sm font-medium text-violet-300">Pipeline running</span>
        <span className="text-xs text-gray-600 ml-auto font-mono">{jobId.slice(0, 8)}…</span>
      </div>

      <div className="space-y-3">
        {PIPELINE_STEPS.map((step) => {
          const state = getStepState(step.status, status)
          return (
            <div key={step.status} className="flex items-start gap-3">
              {/* Step indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  state === 'complete'
                    ? 'bg-green-600'
                    : state === 'active'
                    ? 'bg-violet-600 ring-2 ring-violet-400/30'
                    : 'bg-gray-800 border border-gray-700'
                }`}
              >
                {state === 'complete' ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : state === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                )}
              </div>

              {/* Step text */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    state === 'complete'
                      ? 'text-green-400'
                      : state === 'active'
                      ? 'text-white'
                      : 'text-gray-600'
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    state === 'active' ? 'text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
