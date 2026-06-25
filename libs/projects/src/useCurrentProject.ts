import { useMatch } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { useGetProjectQuery } from './projectsApi'

/**
 * Resolves the project the app is currently scoped to, derived directly from the
 * URL (the single source of truth) rather than transient Redux state. Used by the
 * host (resolution) and the custom-app workspace (top bar, phase rail, sidebar).
 */
export function useCurrentProject() {
  const match = useMatch('/projects/:projectId/*')
  const matchedId = match?.params.projectId

  // `/projects/new` also matches the pattern — it is not a project context.
  const currentProjectId = matchedId && matchedId !== 'new' ? matchedId : null

  const { data, isLoading, isError } = useGetProjectQuery(currentProjectId ?? skipToken)

  return {
    project: currentProjectId ? (data ?? null) : null,
    currentProjectId,
    isLoading,
    isError,
  }
}
