'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus, Tag } from 'lucide-react'

export interface VideoMetadata {
  title: string
  description: string
  tags: string[]
}

interface Props {
  initial: VideoMetadata
  onChange: (meta: VideoMetadata) => void
}

export default function MetadataEditor({ initial, onChange }: Props) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [tags, setTags] = useState<string[]>(initial.tags)
  const [tagInput, setTagInput] = useState('')

  function emit(patch: Partial<VideoMetadata>) {
    onChange({ title, description, tags, ...patch })
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().replace(/^#/, '')
      if (!tags.includes(newTag)) {
        const next = [...tags, newTag]
        setTags(next)
        emit({ tags: next })
      }
      setTagInput('')
    }
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag)
    setTags(next)
    emit({ tags: next })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-text flex items-center gap-2">
        <Tag className="w-4 h-4" /> Metadata
      </h3>

      <div>
        <label className="text-xs text-muted mb-1 block">Title</label>
        <input
          type="text"
          value={title}
          maxLength={100}
          onChange={(e) => { setTitle(e.target.value); emit({ title: e.target.value }) }}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-text text-sm placeholder-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          placeholder="Video title…"
        />
        <p className="text-right text-xs text-muted/50 mt-1">{title.length}/100</p>
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">Description</label>
        <textarea
          value={description}
          maxLength={300}
          rows={3}
          onChange={(e) => { setDescription(e.target.value); emit({ description: e.target.value }) }}
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-text text-sm placeholder-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition resize-none"
          placeholder="Caption / description…"
        />
        <p className="text-right text-xs text-muted/50 mt-1">{description.length}/300</p>
      </div>

      <div>
        <label className="text-xs text-muted mb-1 block">Hashtags</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-violet-900/40 border border-violet-800/60 text-violet-300 text-xs px-2 py-1 rounded-full"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-white transition ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag, press Enter…"
            className="w-full bg-surface2 border border-border rounded-lg pl-8 pr-3 py-2 text-text text-sm placeholder-muted focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
          />
        </div>
      </div>
    </div>
  )
}
