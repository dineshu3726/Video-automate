'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VideoJob, VideoStatus } from '@/types'
import { Clock, CheckCircle2, XCircle, Loader2, Eye, Upload, Film, ArrowRight, Trash2 } from 'lucide-react'

const STATUS_CONFIG: Record<
  VideoStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  pending:    { label: 'Pending',    color: 'text-gray-400',    bg: 'bg-gray-800',     icon: <Clock className="w-3.5 h-3.5" /> },
  scripting:  { label: 'Scripting',  color: 'text-blue-400',    bg: 'bg-blue-900/40',  icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  generating: { label: 'Generating', color: 'text-violet-400',  bg: 'bg-violet-900/40',icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  processing: { label: 'Processing', color: 'text-yellow-400',  bg: 'bg-yellow-900/40',icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  review:     { label: 'Review',     color: 'text-orange-400',  bg: 'bg-orange-900/40',icon: <Eye className="w-3.5 h-3.5" /> },
  approved:   { label: 'Approved',   color: 'text-green-400',   bg: 'bg-green-900/40', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected:   { label: 'Rejected',   color: 'text-red-400',     bg: 'bg-red-900/40',   icon: <XCircle className="w-3.5 h-3.5" /> },
  published:  { label: 'Published',  color: 'text-emerald-400', bg: 'bg-emerald-900/40',icon: <Upload className="w-3.5 h-3.5" /> },
  failed:     { label: 'Failed',     color: 'text-red-400',     bg: 'bg-red-900/40',   icon: <XCircle className="w-3.5 h-3.5" /> },
}

function CardInner({ job, onDelete }: { job: VideoJob; onDelete?: (id: string) => void }) {
  const cfg = STATUS_CONFIG[job.status]
  const [deleting, setDeleting] = useState(false)
  const date = new Date(job.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await onDelete?.(job.id)
    setDeleting(false)
  }

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-4 transition ${
        job.status === 'review'
          ? 'border-orange-900/60 hover:border-orange-700/80 cursor-pointer'
          : job.status === 'approved'
          ? 'border-green-900/60 hover:border-green-700/80 cursor-pointer'
          : 'border-gray-800 hover:border-gray-700'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        job.status === 'review' ? 'bg-orange-900/30' : 'bg-gray-800'
      }`}>
        <Film className={`w-5 h-5 ${job.status === 'review' ? 'text-orange-500' : 'text-gray-500'}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white font-medium text-sm truncate">{job.category}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
            >
              {cfg.icon}
              {cfg.label}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition disabled:opacity-40"
              title="Delete job"
            >
              {deleting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>
        {job.metadata?.title && (
          <p className="text-gray-400 text-xs mt-1 truncate">{job.metadata.title}</p>
        )}
        {job.status === 'failed' && job.metadata?.error && (
          <p className="text-red-400 text-xs mt-1 truncate">{job.metadata.error}</p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-gray-600 text-xs">{date}</p>
          {job.status === 'review' && (
            <span className="text-orange-400 text-xs flex items-center gap-1 font-medium">
              Review now <ArrowRight className="w-3 h-3" />
            </span>
          )}
          {job.status === 'approved' && (
            <span className="text-green-400 text-xs flex items-center gap-1 font-medium">
              Publish <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VideoJobCard({ job, onDelete }: { job: VideoJob; onDelete?: (id: string) => void }) {
  if (job.status === 'review') {
    return (
      <Link href={`/dashboard/review/${job.id}`}>
        <CardInner job={job} onDelete={onDelete} />
      </Link>
    )
  }
  if (job.status === 'approved') {
    return (
      <Link href={`/dashboard/publish/${job.id}`}>
        <CardInner job={job} onDelete={onDelete} />
      </Link>
    )
  }
  return <CardInner job={job} onDelete={onDelete} />
}
