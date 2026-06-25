import { skipToken } from '@reduxjs/toolkit/query'
import { useGetSetupStateQuery } from '../services/implementationApi'

/**
 * Implementation setup/scaffold state, derived from the project's scaffold
 * status rather than whether a tech stack exists. The wizard persists the tech
 * stack on its first step, so keying off "no tech stack" made the wizard
 * collapse the moment the user advanced past step 1 — scaffoldStatus is the
 * real "setup finished" signal (story code-gen is gated on 'ready', ADR-0025).
 *
 * - `needsSetup`  — the inline wizard should take over the page (fresh project,
 *   not skipped, not yet scaffolded). Shared with AppShell so the sidebar hides
 *   in lockstep.
 * - `scaffoldIncomplete` — scaffolding hasn't reached 'ready'; drives the
 *   persistent "finish setup" notice shown on the section pages after a skip.
 * - `isLoading` — setup state is still loading; callers gate first paint on this
 *   so the section pages don't flash before the wizard appears.
 */
export function useImplementationSetupState(projectId: string | undefined) {
  const { data: setup, isLoading } = useGetSetupStateQuery(projectId ?? skipToken)
  const scaffoldReady = setup?.scaffoldStatus === 'ready'
  const needsSetup = Boolean(setup && !setup.wizardDismissed && !scaffoldReady)
  const scaffoldIncomplete = Boolean(setup && !scaffoldReady)
  return { setup, needsSetup, scaffoldIncomplete, isLoading }
}
