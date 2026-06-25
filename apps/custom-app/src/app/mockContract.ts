import type { ProjectAppProps } from '@wispr/contracts'
import { CONTRACT_VERSION } from '@wispr/contracts'
import { api, appEventBus } from '@wispr/services'

/**
 * Mock contract for standalone dev — lets custom-app run alone (no host) with its
 * own store/theme. notify/onNavigate just log; api + event bus are the real
 * shared instances so standalone behaves like composed mode.
 */
export const mockContract: ProjectAppProps = {
  contractVersion: CONTRACT_VERSION,
  projectId: 'standalone-project',
  workspace: { id: 'ws-standalone', name: 'Standalone' },
  user: {
    id: 'u-standalone',
    name: 'Standalone User',
    email: 'standalone@wispr.local',
    roles: ['admin'],
  },
  can: () => true,
  theme: 'light',
  basePath: '/projects/standalone-project',
  services: {
    api,
    notify: { show: ({ message }) => console.info('[notify]', message) },
    flags: { isEnabled: () => false },
    telemetry: { track: () => {} },
  },
  onNavigate: (path) => console.info('[onNavigate]', path),
  eventBus: appEventBus,
}
