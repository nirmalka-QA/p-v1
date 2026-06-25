import type { User } from '@wispr/contracts'

/**
 * Dev-only seed user so the host is fully navigable without a backend. In
 * production this is replaced by the Entra ID OIDC flow + backend session;
 * ProtectedRoute only applies this seed under `import.meta.env.DEV`.
 */
export const DEV_USER: User = {
  id: 'dev-user',
  name: 'Dev User',
  email: 'dev@wispr.local',
  roles: ['platformAdmin'],
}
