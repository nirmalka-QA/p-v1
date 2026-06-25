import { Suspense, useCallback, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Center, Loader } from '@mantine/core'
import { loadRemote, RemoteErrorBoundary, isContractCompatible } from '@wispr/mfe-runtime'
import type { ProjectAppProps } from '@wispr/mfe-runtime'
import { useAppSelector, useAppDispatch, setActiveWorkspace } from '@wispr/store'
import { setActiveWorkspaceId } from '@wispr/services'
import { useGetProjectTypeCatalogQuery } from '@wispr/projects'
import { useRegistry } from './utility/services/registry'
import { useProject } from './utility/hooks/useProject'
import { buildContract } from './utility/helpers/helpers'
import { RemoteFallback } from './components/RemoteFallback'
import { useGetWorkspaceQuery } from '../workspaces/utility/services/services'

type LoadState =
  | { status: 'loading' }
  | { status: 'coming-soon' }
  | { status: 'incompatible' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; Component: ComponentType<ProjectAppProps> }

/**
 * Resolves the project for the current `/projects/:projectId/*` route, derives its
 * PLATFORM type (which remote to mount) + owning workspace from the real projects
 * API, loads the matching remote, checks contract compatibility, and mounts its
 * ProjectApp inside per-remote error isolation. Types whose workspace isn't built
 * yet (catalog status `coming-soon`) degrade to a friendly screen instead of trying
 * to load a missing remote. Deep links / hard refresh re-resolve here.
 */
export function ProjectHost() {
  const { projectId } = useParams()
  const registry = useRegistry()
  const { project, isLoading: projectLoading, isError: projectError } = useProject(projectId)
  const { data: catalog = [] } = useGetProjectTypeCatalogQuery()
  const user = useAppSelector((s) => s.session.user)
  const workspaces = useAppSelector((s) => s.workspace.workspaces)
  const activeWorkspaceId = useAppSelector((s) => s.workspace.activeWorkspaceId)
  const colorScheme = useAppSelector((s) => s.theme.colorScheme)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const onNavigate = useCallback((path: string) => navigate(path), [navigate])

  const projectWorkspaceId = project?.workspaceId
  const resolvedWorkspaceId = projectWorkspaceId || activeWorkspaceId || undefined
  const { data: resolvedWorkspace } = useGetWorkspaceQuery(resolvedWorkspaceId ?? skipToken)

  // Follow the project into its workspace: mark it active (store + the API
  // request-scoping context) when it differs from what's currently active.
  useEffect(() => {
    if (projectWorkspaceId && projectWorkspaceId !== activeWorkspaceId) {
      dispatch(setActiveWorkspace(projectWorkspaceId))
      setActiveWorkspaceId(projectWorkspaceId)
    }
  }, [projectWorkspaceId, activeWorkspaceId, dispatch])

  const [state, setState] = useState<LoadState>({ status: 'loading' })

  const projectType = project?.type
  // Openable only if the type's catalog entry is `available`. Unknown (catalog not
  // loaded yet) is treated as available so we don't flash a coming-soon screen.
  const isComingSoon = catalog.find((e) => e.key === projectType)?.status === 'coming-soon'

  useEffect(() => {
    let active = true

    if (!projectType) {
      setState({ status: 'loading' })
      return () => {
        active = false
      }
    }

    if (isComingSoon) {
      setState({ status: 'coming-soon' })
      return () => {
        active = false
      }
    }

    setState({ status: 'loading' })

    const entry = registry[projectType]
    // contractVersion gate. Phase 2 treats the registry entry's version as the
    // advertised contract version; Phase 3 reads it from the remote's
    // mf-manifest metadata after load and re-checks here.
    if (entry && !isContractCompatible(entry.version)) {
      setState({ status: 'incompatible' })
      return () => {
        active = false
      }
    }

    loadRemote(projectType, registry)
      .then((mod) => {
        if (active) setState({ status: 'ready', Component: mod.default })
      })
      .catch((err: unknown) => {
        if (active) {
          setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) })
        }
      })

    return () => {
      active = false
    }
  }, [projectType, isComingSoon, registry])

  // Gated by ProtectedRoute; this is a type guard for the contract below.
  if (!user) return null

  if (projectLoading || (!project && !projectError)) {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    )
  }

  if (projectError || !project) {
    return <RemoteFallback type={projectId ?? 'project'} error={new Error('Project not found.')} />
  }

  if (state.status === 'coming-soon') {
    return <RemoteFallback type={project.type} comingSoon />
  }
  if (state.status === 'loading') {
    return (
      <Center mih="60vh">
        <Loader />
      </Center>
    )
  }
  if (state.status === 'incompatible') {
    return (
      <RemoteFallback
        type={project.type}
        error={new Error('This remote was built against an incompatible contract version.')}
      />
    )
  }
  if (state.status === 'error') {
    return <RemoteFallback type={project.type} error={state.error} />
  }

  // Best source first: the freshly-resolved workspace; then a store ref (populated
  // by the list); finally a minimal ref so the remote always mounts.
  const workspace = resolvedWorkspace
    ? { id: resolvedWorkspace.id, name: resolvedWorkspace.name }
    : (workspaces.find((w) => w.id === resolvedWorkspaceId) ?? {
        id: resolvedWorkspaceId ?? project.workspaceId,
        name: 'Workspace',
      })
  const contract = buildContract({ project, workspace, user, colorScheme, onNavigate })
  const Remote = state.Component

  return (
    <RemoteErrorBoundary
      type={project.type}
      fallback={(error, retry) => (
        <RemoteFallback type={project.type} error={error} onRetry={retry} />
      )}
    >
      <Suspense
        fallback={
          <Center mih="60vh">
            <Loader />
          </Center>
        }
      >
        <Remote {...contract} />
      </Suspense>
    </RemoteErrorBoundary>
  )
}
