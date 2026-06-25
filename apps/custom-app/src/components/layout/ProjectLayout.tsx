import { Outlet, useParams, Navigate } from 'react-router-dom'
import { ROUTES } from '@wispr/contracts'

/**
 * Route element for `/projects/:projectId`. The shell reads the active project
 * from the URL via `useCurrentProject`, so this layout only guards the param
 * and renders the matched phase route.
 */
export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  if (!projectId) return <Navigate to={ROUTES.projects} replace />
  return <Outlet />
}
