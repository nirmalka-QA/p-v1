import type { Permission, Role, User } from '@wispr/contracts'

const FULL_ACCESS: Role[] = ['platformAdmin', 'owner', 'admin']

/**
 * RBAC is resolved in the host and passed to remotes read-only as `can()`.
 * Admins get everything; members get everything except `admin:*`; viewers get
 * read/view permissions only. Remotes render permission-gated UI but never make
 * auth decisions of record.
 */
export function can(user: User | null, perm: Permission): boolean {
  if (!user) return false
  if (user.roles.some((r) => FULL_ACCESS.includes(r))) return true
  if (user.roles.includes('member')) return !perm.startsWith('admin:')
  if (user.roles.includes('viewer')) return perm.endsWith(':read') || perm.endsWith(':view')
  return false
}

/**
 * Whether the user may reach the platform-admin surfaces — the admin console
 * (`/admin`), the global dashboard, and their top-bar nav entries.
 *
 * TEMPORARY: ALL users are treated as platform admins while the admin console is
 * under construction. Returning unconditionally `true` (rather than `!!user`) also
 * keeps the `/admin` route stable across navigation — its guard never redirects on
 * a transient null session (the cause of the Settings "blink → workspace list").
 * To restore real RBAC, change the body back to
 * `!!user && user.roles.includes('platformAdmin')`.
 */
export function isPlatformAdmin(_user: User | null | undefined): boolean {
  return true
}
