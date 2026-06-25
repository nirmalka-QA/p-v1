import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { ProjectAppProps } from '@wispr/mfe-runtime'
import { useAppDispatch, setUser } from '@wispr/store'
import { StrategyProjectProvider, useStrategyProject } from './app/StrategyProjectContext'
import { StrategyShell } from './components/layout/StrategyShell/StrategyShell'
import { PhasePage } from './features/phase/PhasePage'
import { OpenQuestionsPage } from './features/open-questions/OpenQuestionsPage'
import { StrategyDiscoveryPage } from './features/discovery/DiscoveryPage'
import { registerStrategyPhaseMockRoutes } from './features/phase/utility/services/mocks/phaseStateMock'

// Phase-state mock registers once when the remote loads (composed or standalone); it
// only answers when the data layer runs with mocks on (VITE_USE_MOCKS / configureServices).
registerStrategyPhaseMockRoutes()

/** Index route → the project's first configured phase (resolved from the project). */
function PhaseIndexRedirect() {
  const { phases, phasePath } = useStrategyProject()
  const first = phases[0]
  if (!first) return null
  return <Navigate to={phasePath(first.id)} replace />
}

/**
 * The strategy remote — the federated entry (the one allowed default export). Renders a
 * phase-driven workspace: the configured phase rail (from project.phaseIds) + the phase
 * pages, as RELATIVE routes into the host's router (mounted at /projects/:projectId/*).
 * No router / store / theme here — those are the host's (or the standalone bootstrap's).
 */
export default function ProjectApp(props: ProjectAppProps) {
  // Mirror the contract user into the shared session (idempotent; host usually set it).
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(setUser(props.user))
  }, [dispatch, props.user])

  return (
    <StrategyProjectProvider projectId={props.projectId} basePath={props.basePath}>
      <Routes>
        <Route element={<StrategyShell />}>
          <Route index element={<PhaseIndexRedirect />} />
          {/* Discovery gets its own context-input page before the generic phase view. */}
          <Route path="discovery" element={<StrategyDiscoveryPage />} />
          <Route path=":phaseId" element={<PhasePage />} />
          <Route path=":phaseId/questions" element={<OpenQuestionsPage />} />
        </Route>
      </Routes>
    </StrategyProjectProvider>
  )
}
