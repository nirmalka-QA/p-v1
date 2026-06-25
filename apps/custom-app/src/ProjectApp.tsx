import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { ProjectAppProps } from '@wispr/mfe-runtime'
import { useInjectReducer, useAppDispatch, setUser } from '@wispr/store'

import { AppShell } from './components/layout/AppShell'
import { ProjectLayout } from './components/layout/ProjectLayout'
import { DiscoveryPage } from './features/discovery/DiscoveryPage'
import { PlanningPage } from './features/planning/PlanningPage'
import { FeaturesPage } from './features/features/FeaturesPage'
import { ImplementationLayout } from './features/implementation/ImplementationLayout'
import { StoriesPage } from './features/implementation/StoriesPage'
import { FrontendPage } from './features/implementation/FrontendPage'
import { BackendPage } from './features/implementation/BackendPage'
import { DatabasePage } from './features/implementation/DatabasePage'
import { DesignPage } from './features/implementation/DesignPage'
import { ImplementationLogPage } from './features/implementation/ImplementationLogPage'
import { TestPage } from './features/test/TestPage'
import { implementationJobsReducer } from './features/implementation/utility/slices/implementationJobsSlice'
import { registerCustomAppMockRoutes } from './services/mocks'

// Mantine styles this remote uses beyond the host-provided core/notifications.
// bundleAllCSS in module-federation.config.ts ships these with the exposed
// module so they load when the host mounts the remote.
import '@mantine/dropzone/styles.layer.css'
import '@mantine/dates/styles.layer.css'
import '@mantine/code-highlight/styles.layer.css'
import '@mantine/tiptap/styles.layer.css'

// Phase mock routes register once when the remote loads (composed or
// standalone); they only answer when the host runs with VITE_USE_MOCKS=true.
registerCustomAppMockRoutes()

/**
 * The custom-app remote — the federated entry (the one allowed default export).
 * Renders the project workspace (its existing AppShell chrome + phase rail +
 * the phase routes) as RELATIVE routes into the host's router; the host mounts
 * it under `/projects/:projectId/*`, so the app's absolute `/projects/:projectId`
 * URL matching keeps working unchanged.
 *
 * No router / store / MantineProvider here — those are the host's (or the
 * standalone bootstrap's). The app's `implementationJobs` slice is registered on
 * the single store via useInjectReducer.
 */
export default function ProjectApp(props: ProjectAppProps) {
  useInjectReducer('implementationJobs', implementationJobsReducer)

  // Mirror the contract user into the shared session so anything reading session
  // works in both composed and standalone modes. The host has usually set this
  // already; this is idempotent.
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(setUser(props.user))
  }, [dispatch, props.user])

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route element={<ProjectLayout />}>
          <Route index element={<Navigate to="discovery" replace />} />
          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="implementation" element={<ImplementationLayout />}>
            <Route index element={<Navigate to="stories" replace />} />
            <Route path="stories" element={<StoriesPage />} />
            <Route path="frontend" element={<FrontendPage />} />
            <Route path="backend" element={<BackendPage />} />
            <Route path="database" element={<DatabasePage />} />
            <Route path="design" element={<DesignPage />} />
            <Route path="log" element={<ImplementationLogPage />} />
          </Route>
          <Route path="test" element={<TestPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
