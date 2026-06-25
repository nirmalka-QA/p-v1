import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import { readMockWorkspaces } from '../../../../workspaces/utility/services/mocks/workspacesMock'
import type { IAdminUser, AdminUserStatus } from '../../models/model'

/**
 * Mock for the platform-admin console (backend-less dev/demo; VITE_USE_MOCKS).
 * The user list is aggregated from the workspace membership store so it stays
 * consistent with the workspace views. Platform-level attributes that workspaces
 * don't carry (platform-admin flag + account status) live in a small localStorage
 * overlay keyed by userId, so admin actions survive reloads.
 */

const STORAGE_KEY = 'wispr.mock.admin.overlay.v1'

/** Avatar palette (Mantine names, never hex) cycled deterministically per user. */
const PALETTE = ['indigo', 'teal', 'grape', 'blue', 'cyan', 'violet', 'orange', 'lime', 'pink']

interface UserOverlay {
  isPlatformAdmin: boolean
  status: AdminUserStatus
}

type OverlayStore = Record<string, UserOverlay>

/** Seed: the workspace creator is the platform admin so the console is usable on cold load. */
const SEED_OVERLAY: OverlayStore = {
  'u-sarah': { isPlatformAdmin: true, status: 'active' },
}

function load(): OverlayStore {
  if (typeof window === 'undefined') return { ...SEED_OVERLAY }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as OverlayStore
  } catch {
    // Corrupt store → fall through to the seed.
  }
  return { ...SEED_OVERLAY }
}

function save(overlay: OverlayStore): OverlayStore {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay))
  }
  return overlay
}

let overlay = load()

const envelope = (result: unknown) => ({ result })

/** Aggregates every workspace member into a de-duplicated platform user list. */
function buildUsers(): IAdminUser[] {
  const byId = new Map<string, IAdminUser>()
  for (const ws of readMockWorkspaces()) {
    for (const member of ws.members ?? []) {
      const existing = byId.get(member.userId)
      if (existing) {
        existing.workspaceCount += 1
        if (!existing.workspaceRoles.includes(member.role)) {
          existing.workspaceRoles.push(member.role)
        }
        continue
      }
      const o = overlay[member.userId]
      byId.set(member.userId, {
        userId: member.userId,
        name: member.name,
        ...(member.email ? { email: member.email } : {}),
        colorSeed: member.colorSeed ?? PALETTE[byId.size % PALETTE.length] ?? 'indigo',
        isPlatformAdmin: o?.isPlatformAdmin ?? false,
        status: o?.status ?? 'active',
        workspaceCount: 1,
        workspaceRoles: [member.role],
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Reads the current overlay for a user, seeding a default entry if absent. */
function ensureOverlay(userId: string): UserOverlay {
  if (!overlay[userId]) overlay[userId] = { isPlatformAdmin: false, status: 'active' }
  return overlay[userId]
}

function findUser(userId: string): IAdminUser | undefined {
  return buildUsers().find((u) => u.userId === userId)
}

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'admin/users',
    handler: () => {
      const users = buildUsers()
      return { data: envelope({ users, totalCount: users.length }) }
    },
  },

  {
    method: 'PATCH',
    pattern: 'admin/users/:userId/platform-role',
    handler: ({ params, body }) => {
      const userId = params['userId'] ?? ''
      if (!findUser(userId)) return { status: 404, data: 'User not found.' }
      const { isPlatformAdmin } = (body ?? {}) as { isPlatformAdmin?: boolean }
      ensureOverlay(userId).isPlatformAdmin = Boolean(isPlatformAdmin)
      overlay = save({ ...overlay })
      return { data: envelope(findUser(userId)) }
    },
  },

  {
    method: 'PATCH',
    pattern: 'admin/users/:userId/status',
    handler: ({ params, body }) => {
      const userId = params['userId'] ?? ''
      if (!findUser(userId)) return { status: 404, data: 'User not found.' }
      const { status } = (body ?? {}) as { status?: AdminUserStatus }
      if (status !== 'active' && status !== 'deactivated') {
        return { status: 400, data: 'A valid status is required.' }
      }
      ensureOverlay(userId).status = status
      overlay = save({ ...overlay })
      return { data: envelope(findUser(userId)) }
    },
  },

  {
    method: 'POST',
    pattern: 'admin/users/:userId/sign-out',
    handler: ({ params }) => {
      const userId = params['userId'] ?? ''
      if (!findUser(userId)) return { status: 404, data: 'User not found.' }
      // No persisted session store in the mock — acknowledge the action.
      return { data: envelope(true) }
    },
  },
]

/** Registers the admin console mock routes (call once at boot; gating is `useMocks`). */
export function registerAdminMockRoutes(): void {
  registerMockRoutes(routes)
}
