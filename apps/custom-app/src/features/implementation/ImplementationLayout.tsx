import { Outlet, useParams, useSearchParams } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useCurrentProject } from '@wispr/projects'
import { SetupWizard } from './components/SetupWizard'
import { ScaffoldNotice } from './components/ScaffoldNotice'
import { useDismissWizardMutation } from './utility/services/implementationApi'
import { useImplementationSetupState } from './utility/hooks/useImplementationSetupState'
import { PARAM_SETUP } from './utility/constants/params'

/**
 * Wraps the Implementation section pages. For a project that hasn't been
 * scaffolded yet the setup wizard takes over the page inline (no modal); once
 * scaffolding is 'ready' — or the wizard is skipped — it steps aside and the
 * section pages render with the sidebar. While the wizard is skipped but
 * scaffolding is still incomplete, a persistent notice on the section pages
 * points the user back to finish it. The sidebar Settings action (`?setup=1`)
 * and that notice both re-open the inline wizard. The phase-contextual sidebar
 * is rendered by AppShell, which hides it while the wizard is active (same
 * setup-state signal).
 */
export function ImplementationLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const { setup, needsSetup, scaffoldIncomplete, isLoading } = useImplementationSetupState(projectId)
  const [dismissWizard] = useDismissWizardMutation()

  const reopen = searchParams.get(PARAM_SETUP) === '1'
  const wizardActive = Boolean(projectId && project && (needsSetup || reopen))

  function handleClose() {
    if (projectId && setup && !setup.wizardDismissed) dismissWizard(projectId)
    if (reopen) {
      const next = new URLSearchParams(searchParams)
      next.delete(PARAM_SETUP)
      setSearchParams(next, { replace: true })
    }
  }

  function reopenWizard() {
    const next = new URLSearchParams(searchParams)
    next.set(PARAM_SETUP, '1')
    setSearchParams(next)
  }

  // Hold first paint until the setup state (and project) are known, so the
  // section pages never flash before the wizard takes over.
  if (!projectId || !project || isLoading) {
    return (
      <Center mih={240}>
        <Loader />
      </Center>
    )
  }

  if (wizardActive) {
    return (
      <SetupWizard
        projectId={projectId}
        projectName={project.name}
        projectType={project.type}
        onClose={handleClose}
      />
    )
  }

  return (
    <>
      {scaffoldIncomplete && setup && <ScaffoldNotice status={setup.scaffoldStatus} onComplete={reopenWizard} />}
      <Outlet />
    </>
  )
}
