'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  videoId: string
  onClose: () => void
}

export default function VideoPlayer({ videoId, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
        style={{ width: '360px', maxHeight: '90vh', aspectRatio: '9/16' }}
        onClick={e => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media"
          allowFullScreen
          className="w-full h-full"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
