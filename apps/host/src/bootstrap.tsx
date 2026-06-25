import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { configureServices } from '@wispr/services'
import { registerProjectsMockRoutes, registerStrategyMockRoutes } from '@wispr/projects'
import { registerWorkspacesMockRoutes } from './features/workspaces/utility/services/mocks/workspacesMock'
import { registerDashboardMockRoutes } from './features/global-dashboard/utility/services/mocks/dashboardMock'
import { registerAdminMockRoutes } from './features/admin/utility/services/mocks/adminMock'
import { registerStrategyTemplatesMockRoutes } from './features/admin/utility/services/mocks/strategyTemplatesMock'
import { registerProfileMockRoutes } from './features/profile/utility/services/mocks/profileMock'

// CSS layer order is load-bearing (see CLAUDE.md). tokens.css FIRST: it declares
// `@layer base, mantine` (base = the universal reset, below Mantine) and the
// unlayered design tokens. Then the LAYERED Mantine CSS (`@layer mantine`) so
// Mantine's component styles beat the reset but lose to our unlayered module
// CSS — which is what keeps remote components styled correctly under federation.
import '@wispr/tokens/tokens.css'
import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'

import { App } from './app/App'
import { apiUrl } from './environments/environments'
import { getAccessToken } from './features/auth/utility/helpers/token'
import { loadRegistry } from './features/project-host/utility/services/registry'
import { bindRemoteImporter } from './features/project-host/utility/services/remoteImporter'

/**
 * Host boot sequence: point the shared data layer at the API with the OIDC
 * access token, wire the remote importer, fetch the remote registry, render.
 * The OIDC flow itself (sign-in/renewal) is owned by AuthProvider + ProtectedRoute.
 */
async function boot(): Promise<void> {
  configureServices({
    baseURL: apiUrl,
    getToken: getAccessToken,
    withCredentials: false,
  })
  // Backend-less data: routes are inert unless VITE_USE_MOCKS=true (useMocks).
  registerProjectsMockRoutes()
  registerStrategyMockRoutes()
  registerWorkspacesMockRoutes()
  registerDashboardMockRoutes()
  registerAdminMockRoutes()
  registerStrategyTemplatesMockRoutes()
  registerProfileMockRoutes()
  bindRemoteImporter()

  const registry = await loadRegistry()
  const container = document.getElementById('root')
  if (!container) throw new Error('Root container #root not found')

  createRoot(container).render(
    <StrictMode>
      <App registry={registry} />
    </StrictMode>,
  )
}

void boot()
