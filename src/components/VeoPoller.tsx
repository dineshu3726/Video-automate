'use client'

import { useEffect, useRef } from 'react'
import { VideoJob } from '@/types'

interface Props {
  jobs: VideoJob[]
}

const POLL_INTERVAL_MS = 15_000

/**
 * Invisible component that watches for jobs in 'generating' status,
 * triggers POST /api/veo to start generation, then polls GET /api/veo/poll
 * every 15 s until done. Supabase Realtime (in DashboardClient) picks up
 * the DB update automatically, so no manual refresh is needed.
 */
export default function VeoPoller({ jobs }: Props) {
  // Track which jobs we've already started to avoid duplicate API calls
  const startedRef = useRef<Set<string>>(new Set())
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const generatingJobs = jobs.filter((j) => j.status === 'generating')

    for (const job of generatingJobs) {
      if (startedRef.current.has(job.id)) continue
      startedRef.current.add(job.id)

      startVeo(job.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs])

  // Clean up intervals when component unmounts
  useEffect(() => {
    const intervals = pollingRef.current
    return () => {
      intervals.forEach((id) => clearInterval(id))
    }
  }, [])

  async function startVeo(jobId: string) {
    try {
      const res = await fetch('/api/veo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      if (!res.ok) {
        console.error('[VeoPoller] failed to start veo for', jobId, await res.text())
        return
      }
      startPolling(jobId)
    } catch (err) {
      console.error('[VeoPoller] startVeo error:', err)
    }
  }

  function startPolling(jobId: string) {
    if (pollingRef.current.has(jobId)) return // already polling

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/veo/poll?jobId=${jobId}`)
        if (!res.ok) {
          console.error('[VeoPoller] poll error for', jobId, await res.text())
          return
        }
        const data = await res.json()
        if (data.done) {
          clearInterval(pollingRef.current.get(jobId)!)
          pollingRef.current.delete(jobId)
          // Supabase Realtime will update the UI automatically
        }
      } catch (err) {
        console.error('[VeoPoller] poll fetch error:', err)
      }
    }, POLL_INTERVAL_MS)

    pollingRef.current.set(jobId, intervalId)
  }

  return null // purely behavioural
}
