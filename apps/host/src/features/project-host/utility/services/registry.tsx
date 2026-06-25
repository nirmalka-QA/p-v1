import { createContext, useContext } from 'react'
import type { RemoteRegistry } from '@wispr/mfe-runtime'

/**
 * Fetch the remote registry JSON at boot. In production this is served from
 * Blob / App Configuration and maps project type → remote entry + version;
 * editing it points the host at a new remote version with no host rebuild.
 * Locally it lists only the remotes currently running.
 */
export async function loadRegistry(): Promise<RemoteRegistry> {
  try {
    const res = await fetch('/registry.json', { cache: 'no-store' })
    if (!res.ok) throw new Error(`registry responded ${res.status}`)
    return (await res.json()) as RemoteRegistry
  } catch (err) {
    // A missing/broken registry must not crash the host — it just means no
    // remotes resolve, so opening a project shows the "not running" fallback.
    console.error('[host] failed to load remote registry', err)
    return {}
  }
}

const RegistryContext = createContext<RemoteRegistry>({})

export const RegistryProvider = RegistryContext.Provider
export const useRegistry = (): RemoteRegistry => useContext(RegistryContext)
