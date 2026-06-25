import { useAppSelector } from '@wispr/store'
import { useGetProjectsQuery } from '@wispr/projects'
import type { Project } from '@wispr/projects'
import { canSeeAllProjects } from '../helpers/helpers'
import type { Workspace } from '../models/model'

/** Workspaces hold their full project set; pull a generous page so the in-workspace
 *  list and counts aren't paginated for the demo/mock dataset. */
const PROJECTS_PAGE_SIZE = 100

interface UseWorkspaceProjectsResult {
  projects: Project[]
  /** Whether the viewer sees every project (owner/admin) — the seam Phase 2 "view as" uses. */
  canSeeAll: boolean
  isFetching: boolean
  isError: boolean
  refetch: () => void
}

/**
 * The projects in a workspace, scoped by `workspaceId` (flat-routing: scoping is a
 * request field, not a URL segment). Visibility is role-aware: owners/admins see
 * every project, members/viewers only their assigned ones. Phase 1 has no per-project
 * membership yet, so the list is returned in full and `canSeeAll` is exposed as the
 * seam the Phase 2 "view as" simulation will filter on — no rework needed then.
 */
export function useWorkspaceProjects(
  workspaceId: string,
  workspace: Workspace | null,
): UseWorkspaceProjectsResult {
  const userId = useAppSelector((s) => s.session.user?.id ?? '')
  const { data, isFetching, isError, refetch } = useGetProjectsQuery({
    workspaceId,
    pageSize: PROJECTS_PAGE_SIZE,
  })

  // No workspace yet (still resolving) → assume full visibility; the role gate
  // applies once we know the viewer's membership.
  const canSeeAll = !workspace || canSeeAllProjects(workspace, userId)

  return {
    projects: data?.projects ?? [],
    canSeeAll,
    isFetching,
    isError,
    refetch,
  }
}
