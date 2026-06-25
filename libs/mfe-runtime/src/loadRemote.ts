import type { ComponentType } from 'react'
import type { ProjectAppProps, ProjectType } from '@wispr/contracts'

/** One entry in the remote registry: where to fetch the remote and its version. */
export interface RemoteEntry {
  entry: string
  version: string
}

/** type → remote entry. Fetched by the host at boot (Blob / App Config JSON). */
export type RemoteRegistry = Partial<Record<ProjectType, RemoteEntry>>

/** A loaded remote module: its default export is the ProjectApp component. */
export interface ProjectAppModule {
  default: ComponentType<ProjectAppProps>
}

/**
 * The actual Module Federation import. Inverted as a dependency: @wispr/mfe-runtime
 * stays free of the MF runtime package, and the host wires the real importer in
 * its bootstrap (Phase 2) via setRemoteImporter(). This keeps the loader testable
 * and the lib bundler-agnostic.
 */
export type RemoteImporter = (
  entry: RemoteEntry,
  type: ProjectType,
) => Promise<ProjectAppModule>

let importer: RemoteImporter | null = null

/** Called once in the host bootstrap to bind the MF runtime importer. */
export const setRemoteImporter = (fn: RemoteImporter): void => {
  importer = fn
}

/**
 * Resolve a project type to its remote ProjectApp module via the registry.
 * Throws a clear error when the type is absent (e.g. remote not running locally)
 * or the importer has not been wired — both are rendered by the host as a
 * "remote not running / update required" fallback rather than a crash.
 */
export async function loadRemote(
  type: ProjectType,
  registry: RemoteRegistry,
): Promise<ProjectAppModule> {
  const entry = registry[type]
  if (!entry) {
    throw new Error(`No remote registered for project type "${type}"`)
  }
  if (!importer) {
    throw new Error('Remote importer not configured — call setRemoteImporter() in the host bootstrap')
  }
  return importer(entry, type)
}
