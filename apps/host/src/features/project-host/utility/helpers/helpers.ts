import type { Project, ProjectAppProps, User, WorkspaceRef } from '@wispr/contracts'
import { CONTRACT_VERSION } from '@wispr/contracts'
import { appEventBus } from '@wispr/services'
import { hostServices } from '../../../../app/services'
import { can } from '../../../auth/utility/helpers/helpers'

interface BuildContractArgs {
  project: Project
  workspace: WorkspaceRef
  user: User
  colorScheme: 'light' | 'dark'
  onNavigate: (path: string) => void
}

/**
 * Assemble the read-only contract a remote is mounted with. The host stamps its
 * own CONTRACT_VERSION, computes RBAC into a `can()`, and passes the shared
 * services bag + event bus so the remote uses host-owned singletons.
 */
export function buildContract({
  project,
  workspace,
  user,
  colorScheme,
  onNavigate,
}: BuildContractArgs): ProjectAppProps {
  return {
    contractVersion: CONTRACT_VERSION,
    projectId: project.id,
    workspace,
    user,
    can: (perm) => can(user, perm),
    theme: colorScheme,
    basePath: `/projects/${project.id}`,
    services: hostServices,
    onNavigate,
    eventBus: appEventBus,
  }
}
