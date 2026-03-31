'use client'
import { useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Upload, Youtube, Loader2, Check, AlertCircle, Film, X } from 'lucide-react'

interface Props { user: User }

export default function UploadPublishPanel({ user }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (!f.type.startsWith('video/')) { setError('Please select a video file'); return }
    if (f.size > 256 * 1024 * 1024) { setError('File too large (max 256MB)'); return }
    setError(null)
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('video', file)
    form.append('title', title)
    form.append('description', description)
    form.append('tags', tags)
    form.append('privacy', privacy)
    try {
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setYoutubeUrl(data.url)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-16">
        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-green-400" />
        </div>
        <p className="text-text text-lg font-semibold">Uploaded successfully!</p>
        {youtubeUrl && (
          <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-red-400 hover:underline text-sm">
            <Youtube className="w-4 h-4" /> View on YouTube
          </a>
        )}
        <button onClick={() => { setDone(false); setFile(null); setTitle(''); setDescription(''); setTags('') }}
          className="block mx-auto text-muted text-sm hover:text-text transition">
          Upload another video
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-surface'}`}
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <Upload className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-text font-medium">Drop video here or click to browse</p>
          <p className="text-muted text-sm mt-1">MP4, MOV, WebM -- max 256MB</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text text-sm font-medium truncate">{file.name}</p>
            <p className="text-muted text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button onClick={() => setFile(null)} className="p-1.5 text-muted hover:text-red-400 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metadata form */}
      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Youtube className="w-4 h-4 text-red-400" />
          <h3 className="text-text text-sm font-semibold">YouTube Details</h3>
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Video title"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition placeholder-muted" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add a description..."
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition placeholder-muted resize-none" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Tags (comma separated)</label>
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="shorts, viral, trending"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition placeholder-muted" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1.5 block">Privacy</label>
          <select value={privacy} onChange={e => setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition">
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <button onClick={handleUpload} disabled={uploading || !file || !title.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition">
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Youtube className="w-4 h-4" />Upload to YouTube</>}
      </button>
    </div>
  )
}
