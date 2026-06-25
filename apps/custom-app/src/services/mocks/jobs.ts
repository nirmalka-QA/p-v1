import { nextId, nowIso } from './shared'

/**
 * Progressive-job simulator for the mock API. Generation endpoints follow the
 * backend's start/poll contract ({ jobId, status, steps, …result }); each poll
 * advances one step so AIProgressSteps animates exactly like the live backend,
 * and the finalizer runs once when the last step completes.
 */

export interface JobStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

export interface JobStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed'
  steps: JobStep[]
  [resultKey: string]: unknown
}

interface JobState {
  steps: JobStep[]
  /** Runs once when the last step finishes; its value is merged into the status. */
  finalize: () => Record<string, unknown>
  result?: Record<string, unknown>
  failed?: string
}

const jobs = new Map<string, JobState>()

/** Starts a job: first step running, the rest pending. */
export function startJob(
  stepDefs: { key: string; label: string }[],
  finalize: () => Record<string, unknown>,
): JobStatus {
  const jobId = nextId('job')
  const steps: JobStep[] = stepDefs.map((def, index) => ({
    ...def,
    status: index === 0 ? 'running' : 'pending',
    startedAt: index === 0 ? nowIso() : null,
    endedAt: null,
  }))
  jobs.set(jobId, { steps, finalize })
  return { jobId, status: 'running', steps }
}

/** Advances the job one step per poll; completes (and finalizes) on the last. */
export function pollJob(jobId: string): JobStatus | null {
  const job = jobs.get(jobId)
  if (!job) return null

  if (job.failed) {
    return { jobId, status: 'failed', steps: job.steps }
  }
  if (job.result) {
    return { jobId, status: 'completed', steps: job.steps, ...job.result }
  }

  const runningIndex = job.steps.findIndex((s) => s.status === 'running')
  const current = job.steps[runningIndex]
  if (current) {
    current.status = 'done'
    current.endedAt = nowIso()
    const next = job.steps[runningIndex + 1]
    if (next) {
      next.status = 'running'
      next.startedAt = nowIso()
      return { jobId, status: 'running', steps: job.steps }
    }
  }

  // Last step finished → run the finalizer exactly once.
  try {
    job.result = job.finalize()
    return { jobId, status: 'completed', steps: job.steps, ...job.result }
  } catch (error) {
    job.failed = error instanceof Error ? error.message : 'Generation failed.'
    const last = job.steps[job.steps.length - 1]
    if (last) last.status = 'error'
    return { jobId, status: 'failed', steps: job.steps }
  }
}
