'use client'
import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { VideoJob } from '@/types'
import { Sparkles, Video, Upload } from 'lucide-react'
import GeneratePanel from '@/components/studio/GeneratePanel'
import RecordEditPanel from '@/components/studio/RecordEditPanel'
import UploadPublishPanel from '@/components/studio/UploadPublishPanel'

type SubTab = 'generate' | 'record' | 'upload'

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'generate', label: 'Generate', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'record',   label: 'Record & Edit', icon: <Video className="w-3.5 h-3.5" /> },
  { id: 'upload',   label: 'Upload & Publish', icon: <Upload className="w-3.5 h-3.5" /> },
]

interface Props { user: User; initialJobs: VideoJob[] }

export default function StudioTab({ user, initialJobs }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('generate')

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
              subTab === t.id ? 'bg-bg text-text shadow-sm border border-border' : 'text-muted hover:text-text'
            }`}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {subTab === 'generate' && <GeneratePanel user={user} initialJobs={initialJobs} />}
      {subTab === 'record'   && <RecordEditPanel user={user} />}
      {subTab === 'upload'   && <UploadPublishPanel user={user} />}
    </div>
  )
}
