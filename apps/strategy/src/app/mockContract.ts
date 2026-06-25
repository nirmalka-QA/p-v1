import type { ProjectAppProps } from '@wispr/contracts'
import { CONTRACT_VERSION } from '@wispr/contracts'
import { api, appEventBus } from '@wispr/services'

/** Mock contract for standalone dev (no host). projectId points at a seeded strategy
 *  project so the configured phase rail resolves from the mock API. */
export const mockContract: ProjectAppProps = {
  contractVersion: CONTRACT_VERSION,
  projectId: '102',
  workspace: { id: 'ws1', name: 'Meridian Financial' },
  user: { id: 'u-standalone', name: 'Standalone User', email: 'standalone@wispr.local', roles: ['admin'] },
  can: () => true,
  theme: 'light',
  basePath: '/',
  services: {
    api,
    notify: { show: ({ message }) => console.info('[notify]', message) },
    flags: { isEnabled: () => false },
    telemetry: { track: () => {} },
  },
  onNavigate: (path) => console.info('[onNavigate]', path),
  eventBus: appEventBus,
}
