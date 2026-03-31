import { Eye } from 'lucide-react'

interface Props {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
  viewCount: string
  onClick: () => void
}

function fmtViews(n: string) {
  const num = parseInt(n)
  if (isNaN(num)) return ''
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${Math.round(num / 1_000)}K`
  return String(num)
}

export default function VideoCard({ videoId, title, channelTitle, thumbnail, viewCount, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full focus:outline-none"
    >
      <div className="relative rounded-xl overflow-hidden bg-surface2 border border-border aspect-[9/16] mb-2">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
        ) : (
          <div className="w-full h-full bg-surface2 flex items-center justify-center">
            <span className="text-muted text-xs">No thumbnail</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      <p className="text-text text-xs font-medium leading-snug line-clamp-2 mb-1">{title}</p>
      <div className="flex items-center justify-between">
        <p className="text-muted text-xs truncate">{channelTitle}</p>
        {viewCount && (
          <span className="flex items-center gap-0.5 text-muted text-xs flex-shrink-0 ml-1">
            <Eye className="w-3 h-3" />{fmtViews(viewCount)}
          </span>
        )}
      </div>
    </button>
  )
}
