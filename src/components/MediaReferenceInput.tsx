'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Mic, Loader2, AlertCircle, X, Play, Square, Film, Check } from 'lucide-react'

type Mode = 'upload' | 'record'
type Stage = 'idle' | 'creating' | 'uploading' | 'analyzing' | 'done' | 'error'

interface Props {
  userId: string
  onJobCreated: () => void
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function MediaReferenceInput({ userId, onJobCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('upload')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supabase = createClient()
  const isLoading = ['creating', 'uploading', 'analyzing'].includes(stage)

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [audioUrl])

  function handleFileSelect(file: File) {
    const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi']
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|mov|webm|avi)$/i)) {
      setError('Please select a video file (MP4, MOV, WebM, AVI)')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large — max 100MB')
      return
    }
    setError(null)
    setSelectedFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow mic access and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function clearRecording() {
    setRecordedBlob(null)
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null) }
    setRecordSeconds(0)
  }

  const handleSubmit = useCallback(async () => {
    const fileToUpload = mode === 'upload' ? selectedFile : recordedBlob
      ? new File([recordedBlob], 'recording.webm', { type: recordedBlob.type })
      : null

    if (!fileToUpload) {
      setError(mode === 'upload' ? 'Please select a video file' : 'Please record an audio description')
      return
    }

    setError(null)
    setStage('creating')

    const category = mode === 'upload'
      ? `Reference: ${fileToUpload.name.replace(/\.[^.]+$/, '')}`
      : 'From audio description'

    const { data: job, error: insertError } = await supabase
      .from('video_jobs')
      .insert({ user_id: userId, category, status: 'pending' })
      .select('id')
      .single()

    if (insertError || !job) {
      setError(insertError?.message ?? 'Failed to create job')
      setStage('error')
      return
    }

    onJobCreated()
    setStage('uploading')

    const form = new FormData()
    form.append('file', fileToUpload)
    form.append('jobId', job.id)
    form.append('mode', mode === 'upload' ? 'reference' : 'description')

    setStage('analyzing')
    const res = await fetch('/api/generate-from-upload', { method: 'POST', body: form })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Analysis failed')
      setStage('error')
      onJobCreated()
      return
    }

    setStage('done')
    setSelectedFile(null)
    clearRecording()
    onJobCreated()
    setTimeout(() => setStage('idle'), 2500)
  }, [mode, selectedFile, recordedBlob, userId, supabase, onJobCreated])

  const stageLabel: Record<Stage, string> = {
    idle: mode === 'upload' ? 'Analyze & Generate' : 'Generate from Description',
    creating: 'Creating job…',
    uploading: 'Uploading file…',
    analyzing: 'Gemini is analyzing…',
    done: 'Script ready!',
    error: 'Try again',
  }

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-sm hover:bg-surface2/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-emerald-600/20 rounded-lg flex items-center justify-center">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-left">
            <p className="text-text font-medium text-sm">Upload or Record Reference</p>
            <p className="text-muted text-xs">Upload a video file or record audio to describe your idea</p>
          </div>
        </div>
        <span className="text-muted/50 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-6 pb-6">
          {/* Mode tabs */}
          <div className="flex gap-2 mt-4 mb-5">
            {(['upload', 'record'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null) }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition ${
                  mode === m
                    ? m === 'upload'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-violet-600 text-white'
                    : 'bg-surface2 text-muted hover:text-text'
                }`}
              >
                {m === 'upload' ? <Upload className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {m === 'upload' ? 'Upload Video' : 'Record Audio'}
              </button>
            ))}
          </div>

          {/* Upload panel */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-emerald-500 bg-emerald-900/10'
                    : selectedFile
                    ? 'border-emerald-600 bg-emerald-900/10'
                    : 'border-border hover:border-muted/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/avi,.mp4,.mov,.webm,.avi"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-emerald-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Film className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-text text-sm font-medium truncate">{selectedFile.name}</p>
                        <p className="text-muted text-xs">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null) }}
                      className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/20 transition flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted/40 mx-auto mb-2" />
                    <p className="text-muted text-sm font-medium">Drop video here or click to browse</p>
                    <p className="text-muted/50 text-xs mt-1">MP4, MOV, WebM, AVI — max 100MB</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Record panel */}
          {mode === 'record' && (
            <div className="space-y-4">
              <p className="text-muted text-xs">
                Describe the kind of video you want — topic, style, mood, anything. Gemini will listen and generate content matching your description.
              </p>
              <div className="bg-surface2 rounded-xl p-5 flex flex-col items-center gap-4">
                {!recordedBlob ? (
                  <>
                    {recording && (
                      <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        Recording… {fmt(recordSeconds)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={recording ? stopRecording : startRecording}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
                        recording
                          ? 'bg-red-600 hover:bg-red-500'
                          : 'bg-violet-600 hover:bg-violet-500'
                      }`}
                    >
                      {recording
                        ? <Square className="w-6 h-6 text-white fill-white" />
                        : <Mic className="w-7 h-7 text-white" />
                      }
                    </button>
                    <p className="text-muted text-xs">
                      {recording ? 'Click to stop recording' : 'Click the mic to start recording'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 bg-violet-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-text text-sm font-medium">Recording ready</p>
                        <p className="text-muted text-xs">{fmt(recordSeconds)} recorded</p>
                      </div>
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-red-900/20 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {audioUrl && (
                      <audio controls src={audioUrl} className="w-full h-8" />
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300 bg-emerald-900/20 border border-emerald-900/40 rounded-lg px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              <span>
                {stage === 'creating' && 'Creating job…'}
                {stage === 'uploading' && 'Uploading to Gemini…'}
                {stage === 'analyzing' && 'Gemini is analyzing your file…'}
              </span>
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isLoading || (mode === 'upload' ? !selectedFile : !recordedBlob)}
            onClick={handleSubmit}
            className={`mt-4 w-full font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 ${
              stage === 'done'
                ? 'bg-green-600 text-white'
                : mode === 'upload'
                ? 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white'
                : 'bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : stage === 'done' ? (
              <Check className="w-4 h-4" />
            ) : mode === 'upload' ? (
              <Play className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            {stageLabel[stage]}
          </button>
        </div>
      )}
    </div>
  )
}
