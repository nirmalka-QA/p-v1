import { useState, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Outlet, useMatch, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box } from '@mantine/core'
import { PhaseRail } from './PhaseRail'
import { Sidebar } from './Sidebar'
import { AIAssistantPanel } from './AIAssistantPanel'
import { StatusBar } from './StatusBar'
import { PageContainer } from './PageContainer'
import { useCurrentProject } from '@wispr/projects'
import { useImplementationSetupState } from '../../features/implementation/utility/hooks/useImplementationSetupState'
import { PARAM_SETUP, PARAM_FOCUS } from '../../features/implementation/utility/constants/params'
import { useGetKbQuery } from '../../features/discovery/utility/services/discoveryApi'
import { useGetPlanQuery } from '../../features/planning/utility/services/planningApi'
import { useGetStoriesQuery } from '../../features/features/utility/services/featuresApi'
import { visibleFeatures } from '../../features/planning/utility/helpers/helpers'
import { visibleStories } from '../../features/features/utility/helpers/helpers'
import { isImplStory } from '../../features/implementation/utility/helpers/stories'
import styles from './AppShell.module.css'

// Resizable sidebar bounds. Defaults near the max (see --cl-sidebar-w); the low
// floor lets the user shrink it right down so it never crowds the work area.
const SIDEBAR_MIN_WIDTH = 160
const SIDEBAR_MAX_WIDTH = 380

export function AppShell() {
  const shellRef = useRef<HTMLDivElement>(null)
  const [resizing, setResizing] = useState(false)
  const { project, currentProjectId } = useCurrentProject()
  const inProject = Boolean(project)

  const isDiscovery = Boolean(useMatch('/projects/:projectId/discovery'))
  const isPlanning = Boolean(useMatch('/projects/:projectId/planning'))
  const isFeatures = Boolean(useMatch('/projects/:projectId/features'))
  // Implementation has nested section routes — match the parent and descendants.
  const isImplementation = Boolean(useMatch({ path: '/projects/:projectId/implementation', end: false }))
  const isTest = Boolean(useMatch('/projects/:projectId/test'))
  const [searchParams] = useSearchParams()
  // First-time setup (or a re-open via Settings) takes over the page — hide the
  // sidebar/assistant so the inline wizard owns the work area.
  const { needsSetup, isLoading: setupLoading } = useImplementationSetupState(
    isImplementation ? (currentProjectId ?? undefined) : undefined,
  )
  // Treat the loading window as setup-active too, so the sidebar doesn't flash
  // before the wizard takes over (matches the layout's first-paint gate).
  const implSetupActive =
    isImplementation && (needsSetup || setupLoading || searchParams.get(PARAM_SETUP) === '1')
  // Focus / full-screen mode (Implementation only): hide the phase rail, sidebar,
  // and assistant to give one story's development the full work area.
  const focusMode = isImplementation && searchParams.get(PARAM_FOCUS) === '1'
  const { data: kb } = useGetKbQuery(currentProjectId ?? skipToken)
  const { data: plan } = useGetPlanQuery(currentProjectId ?? skipToken)
  // Stories drive the Test sidebar; only fetch on the Test route to avoid needless calls elsewhere.
  const { data: stories } = useGetStoriesQuery(isTest ? (currentProjectId ?? skipToken) : skipToken)
  const kbExists = Boolean(kb)
  const activeFeatures = plan ? visibleFeatures(plan.features) : []
  const planHasFeatures = activeFeatures.length > 0
  const hasApprovedFeatures = activeFeatures.some((f) => f.status === 'approved')
  // Testable = stories ready for development onward (mirrors TestPage/TestNav).
  const hasTestableStories = stories ? visibleStories(stories).some(isImplStory) : false

  const [assistantOpen, setAssistantOpen] = useState(false)

  // First-time Discovery (no KB yet / analysing) → focused layout: no sidebar, no assistant.
  const discoveryIntro = isDiscovery && !kbExists
  // Planning before its feature list exists (first-time auto-generation) is also focused.
  const planningIntro = isPlanning && !planHasFeatures
  // Features before a plan is approved is focused (points back to Planning).
  const featuresIntro = isFeatures && !hasApprovedFeatures
  // Test before any story is ready for development is focused (points back to Features).
  const testIntro = isTest && !hasTestableStories
  // The sidebar has content for Discovery (KB), Planning (features), Features
  // (approved features), Implementation (section navigation — always shown), and
  // Test (testable stories grouped by feature).
  const showSidebar =
    inProject &&
    !focusMode &&
    ((isDiscovery && kbExists) ||
      (isPlanning && planHasFeatures) ||
      (isFeatures && hasApprovedFeatures) ||
      (isImplementation && !implSetupActive) ||
      (isTest && hasTestableStories))
  const assistantAvailable =
    inProject && !focusMode && !discoveryIntro && !planningIntro && !featuresIntro && !implSetupActive && !testIntro
  const showAssistant = assistantAvailable && assistantOpen

  const bodyClass = showSidebar
    ? showAssistant
      ? styles.bodySidebarMainAssistant
      : styles.bodySidebarMain
    : showAssistant
    ? styles.bodyMainAssistant
    : styles.bodyMain

  // Drag-to-resize the sidebar by writing the clamped width to the layout's
  // CSS variable (keeps all styling in CSS; only the dimension token is dynamic).
  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    setResizing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResize(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizing || !shellRef.current) return
    const left = shellRef.current.getBoundingClientRect().left
    const width = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX - left))
    shellRef.current.style.setProperty('--cl-sidebar-w', `${width}px`)
  }

  function endResize(e: ReactPointerEvent<HTMLDivElement>) {
    setResizing(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  return (
    <Box ref={shellRef} className={`${styles.shell} ${resizing ? styles.resizing : ''}`}>
      {inProject && !focusMode && <PhaseRail />}

      <Box className={`${styles.body} ${bodyClass}`}>
        {showSidebar && (
          <Box component="nav" className={styles.sidebarSlot}>
            <Sidebar />
          </Box>
        )}

        {showSidebar && (
          <Box
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            className={styles.resizeHandle}
            onPointerDown={startResize}
            onPointerMove={handleResize}
            onPointerUp={endResize}
          />
        )}

        <Box component="main" className={styles.workArea}>
          <PageContainer>
            <Outlet />
          </PageContainer>
        </Box>

        {showAssistant && (
          <Box component="aside" className={styles.assistantSlot}>
            <AIAssistantPanel />
          </Box>
        )}
      </Box>

      <StatusBar
        assistantAvailable={assistantAvailable}
        assistantOpen={assistantOpen}
        onToggleAssistant={() => setAssistantOpen((o) => !o)}
      />

    </Box>
  )
}
