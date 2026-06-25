import { registerMockRoutes } from '@wispr/services'
import type { MockRoute } from '@wispr/services'
import { readMockProjects, ProjectStatus } from '@wispr/projects'
import { readMockWorkspaces } from '../../../../workspaces/utility/services/mocks/workspacesMock'
import type {
  UserProfileDetails,
  ProfileProject,
  ProfileProjects,
  ProfileProjectStatus,
} from '../../models/model'

/**
 * Mock for the profile endpoints (backend-less dev/demo; VITE_USE_MOCKS). The
 * project history is derived from the shared project + workspace stores so it stays
 * consistent with the rest of the app; the directory fields (designation/domain/
 * reporting manager) are seeded (a live backend would source these from HR/IAM).
 */

const envelope = (result: unknown) => ({ result })

/** localStorage slot for the uploaded avatar (data URL) so it survives reloads. */
const AVATAR_KEY = 'wispr.mock.profile.avatar.v1'

function loadAvatar(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(AVATAR_KEY)
  } catch {
    return null
  }
}

function saveAvatar(dataUrl: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (dataUrl) window.localStorage.setItem(AVATAR_KEY, dataUrl)
    else window.localStorage.removeItem(AVATAR_KEY)
  } catch {
    // Quota exceeded → keep the in-memory value; persistence is best-effort in the mock.
  }
}

/** Reads an uploaded image File into a base64 data URL the mock can store + serve. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

/** Project-role pool cycled deterministically so the history reads realistically. */
const PROJECT_ROLES = ['Tech Lead', 'Developer', 'Business Analyst', 'QA Engineer', 'Product Manager']

const SEED_PROFILE: UserProfileDetails = {
  id: 'u-sarah',
  name: 'Sarah Adler',
  email: 'sarah.adler@wispr.example',
  designation: 'Senior Software Engineer',
  domain: 'Product Engineering',
  role: 'admin',
  reportingManager: {
    name: 'Marcus King',
    designation: 'Engineering Manager',
    email: 'marcus.king@wispr.example',
  },
}

/** Builds the user's project history from the project + workspace stores. */
function buildProjects(): ProfileProjects {
  const workspaces = readMockWorkspaces()
  const workspaceName = (id?: string) =>
    workspaces.find((w) => String(w.id) === id)?.workspaceName ?? '—'

  const projects: ProfileProject[] = readMockProjects().map((p, i) => ({
    id: String(p.id),
    name: p.projectName,
    workspaceName: workspaceName(p.workspaceId),
    projectRole: PROJECT_ROLES[i % PROJECT_ROLES.length] ?? 'Developer',
    status: p.status === ProjectStatus.COMPLETED ? 'closed' : 'active',
    startedDate: p.createdDate,
  }))

  const activeCount = projects.filter((p) => p.status === 'active').length
  return {
    projects,
    totalCount: projects.length,
    activeCount,
    closedCount: projects.length - activeCount,
  }
}

const routes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'me',
    handler: () => {
      const avatarUrl = loadAvatar()
      const profile = avatarUrl ? { ...SEED_PROFILE, avatarUrl } : SEED_PROFILE
      return { data: envelope(profile) }
    },
  },
  {
    method: 'POST',
    pattern: 'me/avatar',
    handler: async ({ body }) => {
      const form = body instanceof FormData ? body : null
      const file = form?.get('file')
      if (!(file instanceof File)) return { status: 400, data: 'No image file was provided.' }
      const avatarUrl = await fileToDataUrl(file)
      saveAvatar(avatarUrl)
      return { data: envelope({ avatarUrl }) }
    },
  },
  {
    method: 'DELETE',
    pattern: 'me/avatar',
    handler: () => {
      saveAvatar(null)
      return { data: envelope(true) }
    },
  },
  {
    method: 'GET',
    pattern: 'me/projects',
    handler: ({ query }) => {
      const all = buildProjects()
      const status = query['status'] as ProfileProjectStatus | undefined
      if (status === 'active' || status === 'closed') {
        const projects = all.projects.filter((p) => p.status === status)
        return { data: envelope({ ...all, projects }) }
      }
      return { data: envelope(all) }
    },
  },
]

/** Registers the profile mock routes (call once at boot; gating is `useMocks`). */
export function registerProfileMockRoutes(): void {
  registerMockRoutes(routes)
}
