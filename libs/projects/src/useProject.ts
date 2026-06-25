import { useCurrentProject } from './useCurrentProject'

/**
 * Back-compat wrapper around useCurrentProject, preserving the
 * { currentProject, isLoading, error } shape used by usePhase and others.
 */
export function useProject() {
  const { project, isLoading, isError } = useCurrentProject()
  return {
    currentProject: project,
    isLoading,
    error: isError ? 'Failed to load project' : null,
  }
}
