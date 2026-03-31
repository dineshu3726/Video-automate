'use client'
import { useState, useRef, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import {
  Video, Square, Upload, Music, Loader2, Check,
  AlertCircle, Youtube, Camera, X, Volume2, Play
} from 'lucide-react'

interface Props { user: User }
type EditorStep = 'record' | 'edit' | 'upload'

const MAX_SECONDS = 30

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function RecordEditPanel({ user: _user }: Props) {
  const [step, setStep] = useState<EditorStep>('record')
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Edit state
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [musicVolume, setMusicVolume] = useState(50)
  const [muteOriginal, setMuteOriginal] = useState(false)
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

  const liveRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const musicInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Camera preview when idle on record step
  useEffect(() => {
    if (step !== 'record' || recording) return
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play() }
      })
      .catch(() => {})
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [step, recording])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (liveRef.current) { liveRef.current.srcObject = stream; liveRef.current.play() }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setVideoUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
        setStep('edit')
      }

      recorder.start(1000)
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          if (s + 1 >= MAX_SECONDS) { stopRecording(); return MAX_SECONDS }
          return s + 1
        })
      }, 1000)
    } catch (err) {
      console.error(err)
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  async function applyMusic() {
    if (!recordedBlob) return
    setProcessing(true)
    setProcessError(null)

    const form = new FormData()
    form.append('video', recordedBlob, 'recording.webm')
    form.append('muteOriginal', String(muteOriginal))
    form.append('musicVolume', String(musicVolume / 100))
    if (musicFile) form.append('music', musicFile)

    try {
      const res = await fetch('/api/studio/process', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text() || 'Processing failed')
      const blob = await res.blob()
      setProcessedBlob(blob)
      setProcessedUrl(URL.createObjectURL(blob))
      setStep('upload')
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  function skipToUpload() {
    setProcessedBlob(null)
    setProcessedUrl(null)
    setStep('upload')
  }

  async function uploadToYouTube() {
    const blob = processedBlob ?? recordedBlob
    if (!blob || !title.trim()) return
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.append('video', blob, 'video.mp4')
    form.append('title', title)
    form.append('description', description)
    form.append('tags', tags)
    form.append('privacyStatus', privacy)
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
    setStep('record'); setRecordedBlob(null); setVideoUrl(null)
    setProcessedBlob(null); setProcessedUrl(null)
    setUploadDone(false); setYoutubeUrl(null)
    setMusicFile(null); setMusicVolume(50); setMuteOriginal(false)
    setTitle(''); setDescription(''); setTags(''); setElapsed(0)
  }

  const progress = Math.min((elapsed / MAX_SECONDS) * 100, 100)
  const remaining = MAX_SECONDS - elapsed

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['record', 'edit', 'upload'] as EditorStep[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
              step === s ? 'bg-[#2563EB] text-white' :
              (i < (['record','edit','upload'] as EditorStep[]).indexOf(step))
                ? 'bg-green-500 text-white' : 'bg-surface2 text-muted'
            }`}>{i + 1}</div>
            <span className={`text-xs capitalize ${step === s ? 'text-text font-medium' : 'text-muted'}`}>{s}</span>
            {i < 2 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: RECORD ── */}
      {step === 'record' && (
        <div className="space-y-4">
          {/* Live preview */}
          <div className="relative bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '9/16', maxHeight: '420px' }}>
            <video ref={liveRef} className="w-full h-full object-cover" muted playsInline />
            {!recording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
                <Camera className="w-8 h-8 text-white/40" />
                <p className="text-white/50 text-sm">Camera preview</p>
              </div>
            )}
            {recording && (
              <>
                {/* REC badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white text-xs font-bold">REC</span>
                  <span className="text-white text-xs font-mono">{fmt(elapsed)}</span>
                </div>
                {/* Countdown */}
                <div className="absolute top-3 right-3 bg-black/60 rounded-full px-3 py-1.5">
                  <span className={`text-xs font-bold font-mono ${remaining <= 5 ? 'text-red-400' : 'text-white'}`}>
                    -{fmt(remaining)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Progress bar */}
          {recording && (
            <div className="space-y-1">
              <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${remaining <= 5 ? 'bg-red-500' : 'bg-[#2563EB]'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted">
                <span>{fmt(elapsed)} recorded</span>
                <span className={remaining <= 5 ? 'text-red-400 font-semibold' : ''}>{remaining}s remaining</span>
              </div>
            </div>
          )}

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition ${
              recording
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#2563EB] hover:bg-[#1d4ed8] text-white'
            }`}
          >
            {recording
              ? <><Square className="w-4 h-4 fill-white" /> Stop Recording</>
              : <><Video className="w-4 h-4" /> Start Recording</>
            }
          </button>
          <p className="text-center text-muted text-xs">Max {MAX_SECONDS} seconds · Camera only</p>
        </div>
      )}

      {/* ── STEP 2: EDIT ── */}
      {step === 'edit' && videoUrl && (
        <div className="space-y-5">
          {/* Preview */}
          <div className="bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '9/16', maxHeight: '420px' }}>
            <video ref={previewRef} src={videoUrl} className="w-full h-full object-contain" controls playsInline />
          </div>

          {/* Background Music */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#FB923C]" />
              <h3 className="text-text text-sm font-semibold">Background Music</h3>
            </div>

            {!musicFile ? (
              <button
                onClick={() => musicInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-muted hover:text-text hover:border-[#FB923C]/50 hover:bg-surface2 transition text-sm"
              >
                <Upload className="w-4 h-4" />
                Add background music (MP3 / WAV)
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-surface2 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-[#FB923C]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-[#FB923C]" />
                </div>
                <span className="flex-1 text-sm text-text truncate">{musicFile.name}</span>
                <button onClick={() => setMusicFile(null)} className="text-muted hover:text-red-400 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={musicInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/wav,audio/*"
              className="hidden"
              onChange={e => setMusicFile(e.target.files?.[0] ?? null)}
            />

            {/* Volume slider */}
            {musicFile && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-xs flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Music volume
                  </span>
                  <span className="text-xs font-medium text-text">{musicVolume}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={musicVolume}
                  onChange={e => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-[#FB923C]"
                />
              </div>
            )}

            {/* Mute original */}
            <div className="flex items-center justify-between">
              <span className="text-muted text-sm">Mute original video audio</span>
              <button
                onClick={() => setMuteOriginal(!muteOriginal)}
                className={`relative w-11 h-6 rounded-full transition ${muteOriginal ? 'bg-[#2563EB]' : 'bg-surface2'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${muteOriginal ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          {processError && (
            <div className="flex gap-2 text-sm text-red-400 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {processError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={skipToUpload}
              className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface transition text-sm font-medium"
            >
              Skip
            </button>
            <button
              onClick={applyMusic}
              disabled={processing || (!musicFile && !muteOriginal)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FB923C] hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition text-sm"
            >
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                : <><Play className="w-4 h-4" />Apply & Continue</>
              }
            </button>
          </div>
          <p className="text-center text-xs text-muted">
            {!musicFile && !muteOriginal ? 'Add music or mute original to apply changes, or skip to upload as-is' : ''}
          </p>
        </div>
      )}

      {/* ── STEP 3: UPLOAD ── */}
      {step === 'upload' && (
        <div className="space-y-5">
          {(processedUrl || videoUrl) && (
            <div className="bg-black rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: '9/16', maxHeight: '360px' }}>
              <video src={processedUrl ?? videoUrl!} className="w-full h-full object-contain" controls playsInline />
            </div>
          )}

          {uploadDone ? (
            <div className="text-center space-y-3 py-8">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-7 h-7 text-green-500" />
              </div>
              <p className="text-text font-semibold">Uploaded to YouTube!</p>
              {youtubeUrl && (
                <a href={youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#2563EB] text-sm hover:underline">
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
                <Youtube className="w-4 h-4 text-red-500" />
                <h3 className="text-text text-sm font-semibold">Upload to YouTube</h3>
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  placeholder="Enter video title"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-[#2563EB] transition placeholder-muted" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Add a description..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-[#2563EB] transition placeholder-muted resize-none" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Tags (comma separated)</label>
                <input value={tags} onChange={e => setTags(e.target.value)}
                  placeholder="shorts, viral, trending"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-[#2563EB] transition placeholder-muted" />
              </div>
              <div>
                <label className="text-xs text-muted mb-1.5 block">Privacy</label>
                <select value={privacy} onChange={e => setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-text text-sm focus:outline-none focus:border-[#2563EB] transition">
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {uploadError && (
                <div className="flex gap-2 text-sm text-red-400 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{uploadError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('edit')}
                  className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-text hover:bg-surface2 transition text-sm font-medium">
                  Back
                </button>
                <button onClick={uploadToYouTube} disabled={uploading || !title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition text-sm">
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>
                    : <><Youtube className="w-4 h-4" />Upload to YouTube</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
