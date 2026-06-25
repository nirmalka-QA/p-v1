import type { Role } from '@wispr/contracts'
import type { ProfileProjectStatus } from '../models/model'

/** Human label per project-involvement status. */
export const PROFILE_PROJECT_STATUS_LABEL: Record<ProfileProjectStatus, string> = {
  active: 'Active',
  closed: 'Closed',
}

/** Mantine colour per status (badge) — token-driven, never a hex value. */
export const PROFILE_PROJECT_STATUS_COLOR: Record<ProfileProjectStatus, string> = {
  active: 'teal',
  closed: 'gray',
}

/** The project-list filter values (the segmented control). */
export const PROFILE_PROJECT_FILTERS = ['all', 'active', 'closed'] as const
export type ProfileProjectFilter = (typeof PROFILE_PROJECT_FILTERS)[number]

/** Human label per platform role — shown in the basic-details card. */
export const ROLE_LABEL: Record<Role, string> = {
  platformAdmin: 'Platform Admin',
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

/** Avatar colour for the profile — matches the top-bar avatar (indigo). */
export const PROFILE_AVATAR_COLOR = 'indigo'

/** Accepted profile-picture image types. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Value for the file input's `accept` attribute. */
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')

/** Max profile-picture size. Kept modest because the mock persists it in localStorage. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

