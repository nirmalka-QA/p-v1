/**
 * @wispr/mfe-runtime — the glue that mounts remotes into the host: the mount
 * contract types, the registry-driven remote loader, per-remote error isolation,
 * contract-version compatibility, and project-relative navigation. Shared at
 * runtime as a Module Federation singleton so every consumer uses one instance.
 */
export { RemoteErrorBoundary } from './RemoteErrorBoundary'
export {
  loadRemote,
  setRemoteImporter,
} from './loadRemote'
export type {
  RemoteEntry,
  RemoteRegistry,
  RemoteImporter,
  ProjectAppModule,
} from './loadRemote'
export { isContractCompatible } from './contractVersion'
export { useProjectNavigate } from './useProjectNavigate'

// Re-export the mount contract so remotes import their props from one place.
export type { ProjectAppProps } from '@wispr/contracts'
