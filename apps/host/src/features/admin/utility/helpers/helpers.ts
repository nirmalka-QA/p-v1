import type { IAdminUser, AdminUser } from '../models/model'

/** Two-letter initials from a display name (first + last word), upper-cased. */
export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/** Maps a raw API user to the UI shape (derives initials; falls back to a default colour). */
export function mapAdminUser(user: IAdminUser): AdminUser {
  return {
    userId: user.userId,
    name: user.name,
    ...(user.email ? { email: user.email } : {}),
    initials: userInitials(user.name),
    colorSeed: user.colorSeed ?? 'indigo',
    isPlatformAdmin: user.isPlatformAdmin,
    status: user.status,
    workspaceCount: user.workspaceCount,
    workspaceRoles: user.workspaceRoles,
  }
}
