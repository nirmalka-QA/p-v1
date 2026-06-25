// Org-wide aggregates for the platform (admin) dashboard. Host-only.
import type { ProjectType } from '@wispr/projects'

export interface DashboardTypeCount {
  /** The project-type key (stable id for keys/colour) — label is its display name. */
  type: ProjectType
  label: string
  count: number
}

export interface DashboardHealth {
  onTrack: number
  atRisk: number
  onHold: number
}

export interface DashboardActivity {
  projectId: string
  projectName: string
  workspaceName: string
  phase: string
  updatedAt: string
  /** Federation project-type key — drives the activity row's accent dot colour. */
  type: string
}

/** Everything the global dashboard renders, computed across all workspaces + projects. */
export interface DashboardStats {
  workspaceCount: number
  projectCount: number
  peopleCount: number
  artifactCount: number
  projectsByType: DashboardTypeCount[]
  health: DashboardHealth
  recentActivity: DashboardActivity[]
}
