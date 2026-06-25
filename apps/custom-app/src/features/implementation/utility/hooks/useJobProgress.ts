import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../../../app/store'
import type { AnalysisStep } from '../models/model'
import { startJob, setJobSteps, clearJob, selectActiveJob, type ActiveJob } from '../slices/implementationJobsSlice'

/**
 * Tracks one long-running job (by context key) in the Redux store so its
 * progress survives navigating away and back. The poll loop calls begin → push
 * → end; `busy`/`steps`/`kind` reflect the store, so a remounted component shows
 * whatever is currently in flight.
 */
export function useJobProgress(key: string) {
  const dispatch = useDispatch<AppDispatch>()
  const job = useSelector(selectActiveJob(key))

  const begin = useCallback(
    (kind: ActiveJob['kind']) => dispatch(startJob({ key, job: { kind, steps: [] } })),
    [dispatch, key],
  )
  const push = useCallback(
    (steps: AnalysisStep[]) => dispatch(setJobSteps({ key, steps })),
    [dispatch, key],
  )
  const end = useCallback(() => dispatch(clearJob(key)), [dispatch, key])

  return {
    busy: Boolean(job),
    kind: job?.kind,
    steps: job?.steps ?? [],
    begin,
    push,
    end,
  }
}
