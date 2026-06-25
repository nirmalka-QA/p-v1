import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Notifications } from '@mantine/notifications'
import { WisprThemeProvider } from '@wispr/ui'
import { makeStore } from '@wispr/store'

// tokens.css FIRST — declares the `base, mantine` layer order (see CLAUDE.md).
import '@wispr/tokens/tokens.css'
import '@mantine/core/styles.layer.css'
import '@mantine/notifications/styles.layer.css'

import ProjectApp from './ProjectApp'
import { mockContract } from './app/mockContract'

// Standalone mode: the remote provides its OWN store, theme, router and a mock
// contract so it runs in isolation. In composed mode the host provides all of
// these and none of this file runs.
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
