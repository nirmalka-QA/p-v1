import { registerMockRoutes, getServicesConfig } from '@wispr/services'
import { discoveryRoutes } from './discoveryRoutes'
import { planningRoutes } from './planningRoutes'
import { featuresRoutes } from './featuresRoutes'
import { implementationRoutes } from './implementationRoutes'
import { testRoutes } from './testRoutes'
import { seedDemoProject } from './seedDemo'

/**
 * Registers every phase's mock API routes on the shared data layer. Called once
 * when the remote loads (ProjectApp). Registration is cheap and inert — routes
 * only answer when ServicesConfig.useMocks is on (VITE_USE_MOCKS). With mocks
 * on, the demo project is seeded mid-flight so all five phases show content.
 */
export function registerCustomAppMockRoutes(): void {
  registerMockRoutes([
    ...discoveryRoutes,
    ...planningRoutes,
    ...featuresRoutes,
    ...implementationRoutes,
    ...testRoutes,
  ])
  if (getServicesConfig().useMocks) seedDemoProject()
}
