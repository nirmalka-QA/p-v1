import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import { WisprThemeProvider } from '@wispr/ui'
import { makeStore } from '@wispr/store'
import { configureServices } from '@wispr/services'
import { registerProjectsMockRoutes, registerStrategyMockRoutes } from '@wispr/projects'

// tokens.css FIRST — declares the `base, mantine` layer order (see CLAUDE.md).
import '@wispr/tokens/tokens.css'
import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'

import ProjectApp from './ProjectApp'
import { mockContract } from './app/mockContract'

// Standalone has no host boot: turn mocks on and register the project + strategy
// master-data routes so the remote can resolve its project + phase library. (The
// phase-state mock registers itself in ProjectApp.)
configureServices({ useMocks: true })
registerProjectsMockRoutes()
registerStrategyMockRoutes()

const store = makeStore()

const container = document.getElementById('root')
if (!container) throw new Error('Root container #root not found')

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <WisprThemeProvider defaultColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<ProjectApp {...mockContract} />} />
          </Routes>
        </BrowserRouter>
      </WisprThemeProvider>
    </Provider>
  </StrictMode>,
)
