import { loadRemote } from '@module-federation/runtime'
import { setRemoteImporter } from '@wispr/mfe-runtime'
import type { ProjectAppModule } from '@wispr/mfe-runtime'
import type { ProjectType } from '@wispr/contracts'

/**
 * Binds the Module Federation importer that @wispr/mfe-runtime's loadRemote()
 * delegates to, using the MF 2.0 runtime `loadRemote()` — the canonical dynamic
 * API, which returns the fully-resolved exposed module (no manual unwrapping of
 * the dev lazy-stub). The remotes themselves are declared in the host
 * vite.config, so they're already registered with this same runtime instance.
 *
 * Sandbox phase: map project type → MF remote name. (Production target: register
 * remotes from the registry JSON at boot via registerRemotes().)
 */
const REMOTE_NAMES: Partial<Record<ProjectType, string>> = {
  'custom-app': 'custom_app',
  'data-pipeline': 'data_pipeline',
  strategy: 'strategy',
}

export function bindRemoteImporter(): void {
  setRemoteImporter(async (_entry, type) => {
    const name = REMOTE_NAMES[type]
    if (!name) throw new Error(`No federated remote registered for "${type}"`)
    const mod = await loadRemote<ProjectAppModule>(`${name}/ProjectApp`)
    if (!mod?.default) {
      throw new Error(`Remote "${type}" did not provide a default-exported ProjectApp`)
    }
    return { default: mod.default }
  })
}
