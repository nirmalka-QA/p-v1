import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AnalysisStep } from '../models/model'

/** A long-running implementation job (code-gen / repo commit / scaffold) in flight. */
export interface ActiveJob {
  kind: 'generate' | 'repo' | 'iterate' | 'scaffold'
  steps: AnalysisStep[]
}

interface ImplementationJobsState {
  /** Keyed by context (e.g. `${projectId}:${storyId}:${scope}` or `scaffold:${projectId}`). */
  byKey: Record<string, ActiveJob>
}

const initialState: ImplementationJobsState = { byKey: {} }

/**
 * Tracks active long-running jobs in the Redux store so their progress survives
 * navigating away and back (resume-on-return). The polling loops dispatch here;
 * components read the job for their context and render live progress regardless
 * of when they (re)mount.
 */
const implementationJobsSlice = createSlice({
  name: 'implementationJobs',
  initialState,
  reducers: {
    startJob(state, action: PayloadAction<{ key: string; job: ActiveJob }>) {
      state.byKey[action.payload.key] = action.payload.job
    },
    setJobSteps(state, action: PayloadAction<{ key: string; steps: AnalysisStep[] }>) {
      const job = state.byKey[action.payload.key]
      if (job) job.steps = action.payload.steps
    },
    clearJob(state, action: PayloadAction<string>) {
      delete state.byKey[action.payload]
    },
  },
})

export const { startJob, setJobSteps, clearJob } = implementationJobsSlice.actions
export const implementationJobsReducer = implementationJobsSlice.reducer

interface WithJobs {
  implementationJobs: ImplementationJobsState
}
export const selectActiveJob = (key: string) => (state: WithJobs) => state.implementationJobs.byKey[key]
