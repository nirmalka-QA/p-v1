import type { Role } from '@wispr/contracts'
import type { UserProfileDetails, UserProfileView } from '../models/model'
import { PROFILE_AVATAR_COLOR } from '../constants/constants'

/** Two-letter initials from a display name (first + last word), upper-cased. */
export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/**
 * Prepares profile details for the view. Identity (name/email/role) is overlaid
 * from the session when available — it is authoritative from the OIDC token, so
 * the displayed identity always matches the signed-in user even if the directory
 * record lags.
 */
export function toProfileView(
  details: UserProfileDetails,
  identity?: { name?: string | undefined; email?: string | undefined; role?: Role | undefined },
): UserProfileView {
  const name = identity?.name ?? details.name
  return {
    ...details,
    name,
    email: identity?.email ?? details.email,
    role: identity?.role ?? details.role,
    initials: profileInitials(name),
    avatarColor: PROFILE_AVATAR_COLOR,
  }
}

/** Formats an ISO date as e.g. "Mar 2026" for the project history. */
export function formatMonthYear(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
