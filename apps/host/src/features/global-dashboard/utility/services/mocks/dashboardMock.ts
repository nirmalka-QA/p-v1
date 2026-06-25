import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import {
  readMockProjects,
  PROJECT_TYPE_BY_ID,
  PROJECT_TYPE_LABEL,
  PROJECT_STATUS_LABEL,
} from '@wispr/projects'
import type { IProjects } from '@wispr/projects'
import { readMockWorkspaces } from '../../../../workspaces/utility/services/mocks/workspacesMock'
import { projectHealthBucket } from '../../../../workspaces/utility/helpers/helpers'
import type { DashboardStats, DashboardHealth } from '../../models/model'

/**
 * Mock for the global (admin) dashboard. Computes org-wide aggregates from the
 * workspace + project mock stores so the numbers stay consistent with the lists.
 * Health is mock-synthesized (projects carry no health field yet) via the shared
 * projectHealthBucket helper — deterministic per project id, stable across reloads.
 */

const envelope = (result: unknown) => ({ result })

function computeStats(): DashboardStats {
  const workspaces = readMockWorkspaces()
  const projects = readMockProjects()
  const workspaceName = (id?: string) =>
    workspaces.find((w) => String(w.id) === id)?.workspaceName ?? '—'

  const people = new Set(workspaces.flatMap((w) => (w.members ?? []).map((m) => m.name)))
  const artifactCount = workspaces.reduce((sum, w) => sum + (w.artifacts ?? []).length, 0)

  const typeCounts = new Map<number, number>()
  for (const p of projects) typeCounts.set(p.projectTypeId, (typeCounts.get(p.projectTypeId) ?? 0) + 1)
  const projectsByType = [...typeCounts.entries()]
    .map(([typeId, count]) => {
      const type = PROJECT_TYPE_BY_ID[typeId] ?? 'other'
      return { type, label: PROJECT_TYPE_LABEL[type], count }
    })
    .sort((a, b) => b.count - a.count)

  const health: DashboardHealth = { onTrack: 0, atRisk: 0, onHold: 0 }
  for (const p of projects) health[projectHealthBucket(String(p.id))]++

  const byNewest = (a: IProjects, b: IProjects) =>
    new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  const recentActivity = [...projects]
    .sort(byNewest)
    .slice(0, 6)
    .map((p) => ({
      projectId: String(p.id),
      projectName: p.projectName,
      workspaceName: workspaceName(p.workspaceId),
      phase: PROJECT_STATUS_LABEL[p.status as keyof typeof PROJECT_STATUS_LABEL] ?? 'New',
      updatedAt: p.createdDate,
      type: p.projectType ?? 'custom-app',
    }))

  return {
    workspaceCount: workspaces.length,
    projectCount: projects.length,
    peopleCount: people.size,
    artifactCount,
    projectsByType,
    health,
    recentActivity,
  }
}

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'dashboard/stats',
    handler: () => ({ data: envelope(computeStats()) }),
  },
]

/** Registers the global dashboard mock route (call once at boot; gating is `useMocks`). */
export function registerDashboardMockRoutes(): void {
  registerMockRoutes(routes)
}
