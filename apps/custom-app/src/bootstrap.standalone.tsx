import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import { ModalsProvider } from '@mantine/modals'
import { WisprThemeProvider } from '@wispr/ui'
import { makeStore } from '@wispr/store'
import { configureServices } from '@wispr/services'
import { registerProjectsMockRoutes } from '@wispr/projects'

// tokens.css FIRST — declares the `base, mantine` layer order (see CLAUDE.md).
import '@wispr/tokens/tokens.css'
import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'

import ProjectApp from './ProjectApp'
import { mockContract } from './app/mockContract'
import { apiUrl } from './environments/environments'
import { getAccessToken } from './features/auth/utility/helpers/token'

// Standalone mode: custom-app provides its OWN store/theme/router and points the
// shared data layer at the API with the OIDC token (if signed in). In composed
// mode the host provides all of this and none of this file runs.
configureServices({
  baseURL: apiUrl,
  getToken: getAccessToken,
  withCredentials: false,
})
// Standalone needs the project routes too (the host registers them when composed).
registerProjectsMockRoutes()

const store = makeStore()
const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <WisprThemeProvider defaultColorScheme="light">
        <ModalsProvider>
          <Notifications position="top-right" />
          <BrowserRouter>
            <Routes>
              <Route path="/projects/:projectId/*" element={<ProjectApp {...mockContract} />} />
              <Route
                path="*"
                element={<Navigate to={`/projects/${mockContract.projectId}`} replace />}
              />
            </Routes>
          </BrowserRouter>
        </ModalsProvider>
      </WisprThemeProvider>
    </Provider>
  </StrictMode>,
)
