import type { ProjectAppProps } from '@wispr/contracts'
import { CONTRACT_VERSION } from '@wispr/contracts'
import { api, appEventBus } from '@wispr/services'

/**
 * Mock contract for standalone dev — lets the remote run alone (no host) with
 * its own store/theme. Notify/onNavigate just log; the api + event bus are the
 * real shared instances so standalone behaves like composed mode.
 */
export const mockContract: ProjectAppProps = {
  contractVersion: CONTRACT_VERSION,
  projectId: 'standalone',
  workspace: { id: 'ws-standalone', name: 'Standalone' },
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
