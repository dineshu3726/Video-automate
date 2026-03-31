'use client'
import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import {
  Video, Square, Upload,
  Scissors, Volume2, Loader2, Check,
  AlertCircle, Youtube, Monitor, Camera
} from 'lucide-react'

interface Props { user: User }

type RecordSource = 'camera' | 'screen'
type EditorStep = 'record' | 'edit' | 'upload'

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordEditPanel({ user }: Props) {
  const [step, setStep] = useState<EditorStep>('record')
  const [source, setSource] = useState<RecordSource>('camera')
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [duration, setDuration] = useState(0)

  // Edit state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [muteAudio, setMuteAudio] = useState(false)
  const [swapAudioFile, setSwapAudioFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [processError, setProcessError] = useState<string | null>(null)

  // Upload state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDone, setUploadDone] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null)

  const liveVideoRef = useRef<HTMLVideoElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const MAX_RECORD_SECONDS = 120

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live camera preview
  useEffect(() => {
    if (step === 'record' && !recording && source === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          streamRef.current = stream
          if (liveVideoRef.current) {
            liveVideoRef.current.srcObject = stream
            liveVideoRef.current.play()
          }
        })
        .catch(() => {})
    }
    return () => {
      if (step === 'record' && !recording) {
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
    }
  }, [step, source, recording])

  async function startRecording() {
    try {
      let stream: MediaStream
      if (source === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      }
      streamRef.current = stream
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream
        liveVideoRef.current.play()
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        stream.getTracks().forEach(t => t.stop())
        setStep('edit')
      }

      recorder.start(1000)
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => {
          if (s + 1 >= MAX_RECORD_SECONDS) { stopRecording(); return s }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      console.error(err)
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function onVideoLoaded() {
    const dur = previewVideoRef.current?.duration ?? 0
    setDuration(Math.floor(dur))
    setTrimEnd(Math.floor(dur))
  }

  async function processVideo() {
    if (!recordedBlob) return
    setProcessing(true)
    setProcessError(null)

    const form = new FormData()
    form.append('video', recordedBlob, 'recording.webm')
    form.append('trimStart', String(trimStart))
    form.append('trimEnd', String(trimEnd))
    form.append('muteAudio', String(muteAudio))
    if (swapAudioFile) form.append('swapAudio', swapAudioFile)

    try {
      const res = await fetch('/api/studio/process', { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Processing failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setProcessedBlob(blob)
      setProcessedUrl(url)
      setStep('upload')
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  async function uploadToYouTube() {
    if (!processedBlob && !recordedBlob) return
    setUploading(true)
    setUploadError(null)

    const blob = processedBlob ?? recordedBlob!
    const form = new FormData()
    form.append('video', blob, 'video.mp4')
    form.append('title', title || 'My VideoForge Recording')
    form.append('description', description)
    form.append('tags', tags)
    form.append('privacy', privacy)

    try {
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setYoutubeUrl(data.url)
      setUploadDone(true)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setStep('record')
    setRecordedBlob(null)
    setVideoUrl(null)
    setProcessedBlob(null)
    setProcessedUrl(null)
    setUploadDone(false)
    setYoutubeUrl(null)
    setTrimStart(0)
    setTrimEnd(0)
    setMuteAudio(false)
    setSwapAudioFile(null)
    setTitle('')
    setDescription('')
    setTags('')
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['record', 'edit', 'upload'] as EditorStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step === s ? 'bg-primary text-white' : (
                (step === 'edit' && s === 'record') || (step === 'upload' && s !== 'upload')
                  ? 'bg-green-600 text-white' : 'bg-surface2 text-muted'
              )
            }`}>{i + 1}</div>
            <span className={`text-xs capitalize ${step === s ? 'text-text font-medium' : 'text-muted'}`}>{s}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* STEP 1: RECORD */}
      {step === 'record' && (
        <div className="space-y-4">
          {/* Source selector */}
          <div className="flex gap-2">
            {(['camera', 'screen'] as RecordSource[]).map(s => (
              <button key={s} onClick={() => setSource(s)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${
                  source === s ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted hover:text-text'
                }`}>
                {s === 'camera' ? <Camera className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                {s === 'camera' ? 'Webcam' : 'Screen'}
              </button>
            ))}
          </div>

          {/* Live preview */}
          <div className="relative bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '16/9' }}>
            <video ref={liveVideoRef} className="w-full h-full object-cover" muted playsInline />
            {!recording && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <p className="text-white/60 text-sm">Camera preview</p>
              </div>
            )}
            {recording && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white text-xs font-medium">{fmt(recordSeconds)}</span>
                <span className="text-white/50 text-xs">/ {fmt(MAX_RECORD_SECONDS)}</span>
              </div>
            )}
          </div>

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
              recording
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}>
            {recording ? <><Square className="w-4 h-4 fill-white" /> Stop Recording</> : <><Video className="w-4 h-4" /> Start Recording</>}
          </button>
          <p className="text-center text-muted text-xs">Max {fmt(MAX_RECORD_SECONDS)} recording</p>
        </div>
      )}

      {/* STEP 2: EDIT */}
      {step === 'edit' && videoUrl && (
        <div className="space-y-5">
          {/* Preview */}
          <div className="bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '16/9' }}>
            <video
              ref={previewVideoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              onLoadedMetadata={onVideoLoaded}
            />
          </div>

          {/* Trim */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-accent" />
              <h3 className="text-text text-sm font-semibold">Trim Video</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>Start: {fmt(trimStart)}</span>
                  <span>Duration after trim: {fmt(Math.max(0, trimEnd - trimStart))}</span>
                </div>
                <input type="range" min={0} max={duration} value={trimStart} onChange={e => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                  className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>End: {fmt(trimEnd)}</span>
                  <span>Total: {fmt(duration)}</span>
                </div>
                <input type="range" min={0} max={duration} value={trimEnd} onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))}
                  className="w-full accent-primary" />
              </div>
            </div>
          </div>

          {/* Audio */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <h3 className="text-text text-sm font-semibold">Audio</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted text-sm">Mute original audio</span>
              <button onClick={() => setMuteAudio(!muteAudio)}
                className={`relative w-11 h-6 rounded-full transition ${muteAudio ? 'bg-primary' : 'bg-surface2'}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${muteAudio ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            <div>
              <p className="text-muted text-xs mb-2">Swap audio track (optional)</p>
              <label className={`flex items-center gap-3 border border-dashed border-border rounded-lg px-4 py-3 cursor-pointer hover:bg-surface2 transition ${muteAudio ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload className="w-4 h-4 text-muted" />
                <span className="text-sm text-muted">{swapAudioFile ? swapAudioFile.name : 'Upload MP3/WAV to replace audio'}</span>
                <input type="file" accept="audio/*" className="hidden" onChange={e => setSwapAudioFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>

          {processError && (
            <div className="flex gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {processError}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('upload')}
              className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface transition text-sm font-medium">
              Skip Editing
            </button>
            <button onClick={processVideo} disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-medium transition text-sm">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</> : <><Scissors className="w-4 h-4" />Apply Edits</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-5">
          {/* Preview processed or original */}
          {(processedUrl || videoUrl) && (
            <div className="bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '16/9' }}>
              <video src={processedUrl ?? videoUrl!} className="w-full h-full object-contain" controls />
            </div>
          )}

          {uploadDone ? (
            <div className="text-center space-y-3 py-8">
              <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-text font-semibold">Uploaded to YouTube!</p>
              {youtubeUrl && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary text-sm hover:underline">
                  <Youtube className="w-4 h-4" /> View on YouTube
                </a>
              )}
              <button onClick={reset} className="block mx-auto text-muted text-sm hover:text-text transition mt-2">
                Record another video
              </button>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-400" />
                <h3 className="text-text text-sm font-semibold">Upload to YouTube</h3>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  placeholder="Enter video title"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition placeholder-muted" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Add a description..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-primary transition placeholder-muted resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Tags (comma separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="shorts, viral, trending"
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
              {uploadError && (
                <div className="flex gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{uploadError}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('edit')} className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface2 transition text-sm font-medium">
                  Back to Edit
                </button>
                <button onClick={uploadToYouTube} disabled={uploading || !title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition text-sm">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</> : <><Youtube className="w-4 h-4" />Upload to YouTube</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
