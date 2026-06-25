import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ROUTES } from '@wispr/contracts'
import { HostLayout } from '../components/layout/HostLayout'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { WorkspaceListPage } from '../features/workspaces/WorkspaceListPage'
import { WorkspaceHomePage } from '../features/workspaces/WorkspaceHomePage'
import { GlobalDashboardPage } from '../features/global-dashboard/GlobalDashboardPage'
import { AdminPage } from '../features/admin/AdminPage'
import { ProfilePage } from '../features/profile/ProfilePage'
import { ProjectHost } from '../features/project-host/ProjectHost'

/**
 * The one router for the running app, owned by the host. Workspaces are the entry
 * point: the list (`/workspaces`), the admin global dashboard (`/dashboard`), and a
 * single workspace's home (`/workspaces/:workspaceId`). A project always belongs to
 * a workspace, but keeps a FLAT url — `/projects/:projectId/*` is handed to
 * ProjectHost, which mounts the matching remote (the remote's basePath stays
 * `/projects/:projectId`, unchanged). The old global `/projects` list is retired:
 * the project list now lives inside a workspace.
 */
export const router = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <HostLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Navigate to={ROUTES.workspaces} replace /> },
      // OIDC redirect target (VITE_REDIRECT_URI = …/auth/callback). AuthProvider
      // processes the ?code on load; once authenticated we land on the workspace list.
      { path: '/auth/callback', element: <Navigate to={ROUTES.workspaces} replace /> },
      { path: '/workspaces', element: <WorkspaceListPage /> },
      { path: '/dashboard', element: <GlobalDashboardPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/workspaces/:workspaceId', element: <WorkspaceHomePage /> },
      // Retired global project surfaces — the list + creation now live inside a workspace.
      { path: '/projects', element: <Navigate to={ROUTES.workspaces} replace /> },
      { path: '/projects/new', element: <Navigate to={ROUTES.workspaces} replace /> },
      { path: '/projects/:projectId/*', element: <ProjectHost /> },
    ],
  },
])
