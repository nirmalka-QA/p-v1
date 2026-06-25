import { useEffect } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useAppDispatch, setActiveWorkspace } from '@wispr/store'
import { setActiveWorkspaceId } from '@wispr/services'
import { useGetWorkspaceQuery } from '../services/services'
import type { Workspace } from '../models/model'

interface UseActiveWorkspaceResult {
  workspace: Workspace | null
  isFetching: boolean
  isError: boolean
}

/**
 * Resolves the active workspace (the rich entity, from the RTK Query cache) for a
 * given id and marks it active in both the store (the federation-facing
 * workspaceSlice) and the request-scoping context the API reads. The id is the URL
 * param (the single source of truth), so navigating between workspaces keeps the
 * active workspace, the remote's WorkspaceRef, and request scoping in lock-step.
 */
export function useActiveWorkspace(workspaceId: string | undefined): UseActiveWorkspaceResult {
  const dispatch = useAppDispatch()
  const { data: workspace, isFetching, isError } = useGetWorkspaceQuery(workspaceId ?? skipToken)

  useEffect(() => {
    if (!workspaceId) return
    dispatch(setActiveWorkspace(workspaceId))
    setActiveWorkspaceId(workspaceId)
  }, [workspaceId, dispatch])

  return { workspace: workspace ?? null, isFetching, isError }
}
