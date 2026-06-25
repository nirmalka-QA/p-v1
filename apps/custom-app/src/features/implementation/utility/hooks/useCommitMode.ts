import { useCallback, useState } from 'react'
import type { CodeScope } from '../models/model'

/** Per-area code-commit behaviour: open the PR automatically after a push, or review first. */
export type CommitMode = 'auto' | 'manual'

function storageKey(projectId: string, scope: CodeScope): string {
  return `wispr:commit-mode:${projectId}:${scope}`
}

/**
 * Per-project, per-area (frontend/backend) commit preference.
 *
 * Persisted in localStorage for now. When the Function API adds a per-area
 * commit-mode field, swap the read/write below for a query + mutation — the
 * hook's [mode, setMode] shape stays the same, so no caller changes.
 * Backend contract to add: GET/PATCH on the tech-stack or setup record with a
 * `commitMode: 'auto' | 'manual'` per scope.
 */
export function useCommitMode(projectId: string, scope: CodeScope): [CommitMode, (mode: CommitMode) => void] {
  const [mode, setModeState] = useState<CommitMode>(() =>
    window.localStorage.getItem(storageKey(projectId, scope)) === 'auto' ? 'auto' : 'manual',
  )

  const setMode = useCallback(
    (next: CommitMode) => {
      setModeState(next)
      try {
        window.localStorage.setItem(storageKey(projectId, scope), next)
      } catch {
        // Storage unavailable (private mode / quota) — keep the in-memory value only.
      }
    },
    [projectId, scope],
  )

  return [mode, setMode]
}
