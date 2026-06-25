import { skipToken } from '@reduxjs/toolkit/query'
import type { Project } from '@wispr/contracts'
import { useGetProjectQuery } from '@wispr/projects'

interface UseProjectResult {
  /** The federation-facing project (contract shape) the host mounts a remote with. */
  project: Project | null
  isLoading: boolean
  isError: boolean
}

/**
 * Resolves the project for the current `/projects/:projectId/*` route from the
 * real projects API and maps it to the minimal `@wispr/contracts` Project the host
 * needs — `projectType` (federation) becomes `type`, which selects the remote.
 * Replaces the earlier id-prefix mock.
 */
export function useProject(projectId: string | undefined): UseProjectResult {
  const { data, isLoading, isError } = useGetProjectQuery(projectId ?? skipToken)

  const project: Project | null = data
    ? { id: data.id, name: data.name, type: data.projectType, workspaceId: data.workspaceId }
    : null

  return { project, isLoading, isError }
}
