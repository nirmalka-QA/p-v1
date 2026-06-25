import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { WisprThemeProvider } from '@wispr/ui'
import type { RemoteRegistry } from '@wispr/mfe-runtime'
import { store } from './store'
import { router } from './router'
import { oidcConfig } from '../features/auth/utility/services/oidcConfig'
import { RegistryProvider } from '../features/project-host/utility/services/registry'

/**
 * The host's single set of runtime providers: one store, one OIDC auth context,
 * one Mantine theme, one router. Remotes inherit the store/theme/router via
 * federation singletons and never wrap their own; auth is host-only.
 */
export function App({ registry }: { registry: RemoteRegistry }) {
  return (
    <Provider store={store}>
      <AuthProvider {...oidcConfig}>
        <WisprThemeProvider defaultColorScheme="light">
          <ModalsProvider>
            <Notifications position="top-right" />
            <RegistryProvider value={registry}>
              <RouterProvider router={router} />
            </RegistryProvider>
          </ModalsProvider>
        </WisprThemeProvider>
      </AuthProvider>
    </Provider>
  )
}
