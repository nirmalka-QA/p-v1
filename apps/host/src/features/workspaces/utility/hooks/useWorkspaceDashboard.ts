import { useMemo, useState } from 'react'
import { useGetProjectsQuery } from '@wispr/projects'
import type { Project } from '@wispr/projects'
import { projectTypeLabel } from '../../../projects/utility/constants/constants'
import {
  projectsVisibleTo,
  canSeeAllProjects,
  workspaceRoleOf,
  projectHealthBucket,
} from '../helpers/helpers'
import type { ProjectHealth } from '../helpers/helpers'
import { WORKSPACE_ROLE_LABEL } from '../constants/constants'
import type { Workspace } from '../models/model'

const PROJECTS_PAGE_SIZE = 100

export interface WorkspaceDashboardTypeCount {
  type: string
  label: string
  count: number
}

export interface WorkspaceDashboardRow {
  project: Project
  health: ProjectHealth
}

export interface ViewAsOption {
  value: string
  label: string
}

interface UseWorkspaceDashboardResult {
  /** The member whose visibility is being simulated. */
  viewAs: string
  setViewAs: (userId: string) => void
  viewAsOptions: ViewAsOption[]
  /** Whether the simulated member sees every project (owner/admin). */
  seesAll: boolean
  viewAsRoleLabel: string
  rows: WorkspaceDashboardRow[]
  projectCount: number
  onTrack: number
  atRisk: number
  peopleCount: number
  byType: WorkspaceDashboardTypeCount[]
  isFetching: boolean
  isError: boolean
  refetch: () => void
}

/**
 * Data for a workspace's dashboard tab. Computes KPIs, per-type counts, and the
 * project status rows for the member currently being simulated by "view as" — owners
 * and admins see every project; members/viewers see only their assigned subset
 * (projectsVisibleTo). Health is synthesised deterministically (projects carry none
 * yet). The view-as member defaults to the first owner.
 */
export function useWorkspaceDashboard(workspace: Workspace): UseWorkspaceDashboardResult {
  const { data, isFetching, isError, refetch } = useGetProjectsQuery({
    workspaceId: workspace.id,
    pageSize: PROJECTS_PAGE_SIZE,
  })
  const allProjects = useMemo(() => data?.projects ?? [], [data])

  const defaultMember =
    workspace.members.find((m) => m.role === 'owner')?.userId ??
    workspace.members[0]?.userId ??
    ''
  const [viewAsState, setViewAs] = useState<string>('')
  // Fall back to the default member until one is explicitly chosen (or if the chosen
  // member is no longer present after a refetch).
  const viewAs =
    viewAsState && workspace.members.some((m) => m.userId === viewAsState)
      ? viewAsState
      : defaultMember

  const viewAsOptions = workspace.members.map((m) => ({
    value: m.userId,
    label: `${m.name} — ${WORKSPACE_ROLE_LABEL[m.role]}`,
  }))
  const viewAsRole = workspaceRoleOf(workspace, viewAs)
  const viewAsRoleLabel = viewAsRole ? WORKSPACE_ROLE_LABEL[viewAsRole] : 'no workspace role'
  const seesAll = canSeeAllProjects(workspace, viewAs)

  const visible = useMemo(
    () => projectsVisibleTo(workspace, allProjects, viewAs),
    [workspace, allProjects, viewAs],
  )

  const rows = useMemo(
    () => visible.map((project) => ({ project, health: projectHealthBucket(project.id) })),
    [visible],
  )

  const onTrack = rows.filter((r) => r.health === 'onTrack').length
  const atRisk = rows.filter((r) => r.health === 'atRisk').length

  const byType = useMemo<WorkspaceDashboardTypeCount[]>(() => {
    const counts = new Map<string, number>()
    for (const p of visible) counts.set(p.projectType, (counts.get(p.projectType) ?? 0) + 1)
    return [...counts.entries()]
      .map(([type, count]) => ({ type, label: projectTypeLabel(type), count }))
      .sort((a, b) => b.count - a.count)
  }, [visible])

  return {
    viewAs,
    setViewAs,
    viewAsOptions,
    seesAll,
    viewAsRoleLabel,
    rows,
    projectCount: visible.length,
    onTrack,
    atRisk,
    peopleCount: workspace.members.length,
    byType,
    isFetching,
    isError,
    refetch,
  }
}
