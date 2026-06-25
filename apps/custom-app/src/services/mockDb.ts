import type {
  KnowledgeBase,
  UploadedFile,
  PlanningPlan,
  Story,
  TechStack,
  GeneratedCode,
  RepoConnection,
  ChangeImpactAlert,
  AuditEntry,
  DesignAssets,
  DbSchema,
  ImplementationSetup,
  TestCase,
} from '../types'

/**
 * Mock persistence for backend-less development (the mock API routes in
 * `services/mocks/` and the remaining `queryFn` endpoints read/write through
 * this). Backed by localStorage so a demo project's data survives reloads;
 * falls back to in-memory when storage is unavailable.
 */

interface MockDbState {
  knowledgeBases: Record<string, KnowledgeBase>
  uploads: Record<string, UploadedFile[]>
  plans: Record<string, PlanningPlan>
  stories: Record<string, Story[]>
  techStacks: Record<string, TechStack>
  generatedCode: Record<string, GeneratedCode>
  repoConnections: Record<string, RepoConnection>
  alerts: Record<string, ChangeImpactAlert[]>
  audit: Record<string, AuditEntry[]>
  designAssets: Record<string, DesignAssets>
  dbSchemas: Record<string, DbSchema>
  implementationSetup: Record<string, ImplementationSetup>
  testCases: Record<string, TestCase[]>
}

const STORAGE_KEY = 'wispr.mock.db.v1'

const emptyState = (): MockDbState => ({
  knowledgeBases: {},
  uploads: {},
  plans: {},
  stories: {},
  techStacks: {},
  generatedCode: {},
  repoConnections: {},
  alerts: {},
  audit: {},
  designAssets: {},
  dbSchemas: {},
  implementationSetup: {},
  testCases: {},
})

function hydrate(): MockDbState {
  if (typeof window === 'undefined') return emptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyState(), ...(JSON.parse(raw) as Partial<MockDbState>) }
  } catch {
    // Corrupt store → start clean.
  }
  return emptyState()
}

const state = hydrate()

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded / private mode — keep going in-memory.
  }
}

const {
  knowledgeBases,
  uploads,
  plans,
  stories,
  techStacks,
  // Generated code keyed per project + scope + story (see mocks/implementationRoutes).
  generatedCode,
  repoConnections,
  // Cross-phase change-impact alerts + append-only audit trail, per project.
  alerts,
  audit,
  // Implementation: design system assets, generated DB schema, setup wizard state.
  designAssets,
  dbSchemas,
  implementationSetup,
  // Test phase: test cases per project (across all implemented stories).
  testCases,
} = state

/** Simulated network latency so loading states are observable. */
export function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockDb = {
  // ── Knowledge Base ──
  getKb(projectId: string): KnowledgeBase | null {
    return knowledgeBases[projectId] ?? null
  },
  saveKb(kb: KnowledgeBase): KnowledgeBase {
    knowledgeBases[kb.projectId] = kb
    persist()
    return kb
  },

  // ── Uploads / artifacts ──
  listUploads(projectId: string): UploadedFile[] {
    return uploads[projectId] ?? []
  },
  addUploads(projectId: string, items: UploadedFile[]): UploadedFile[] {
    uploads[projectId] = [...items, ...(uploads[projectId] ?? [])]
    persist()
    return uploads[projectId]
  },
  removeUpload(projectId: string, fileId: string): UploadedFile[] {
    uploads[projectId] = (uploads[projectId] ?? []).filter((f) => f.id !== fileId)
    persist()
    return uploads[projectId]
  },

  // ── Planning (feature list + suggestions) ──
  getPlan(projectId: string): PlanningPlan | null {
    return plans[projectId] ?? null
  },
  savePlan(plan: PlanningPlan): PlanningPlan {
    plans[plan.projectId] = plan
    persist()
    return plan
  },

  // ── Features (user stories, project-wide) ──
  getStories(projectId: string): Story[] {
    return stories[projectId] ?? []
  },
  saveStories(projectId: string, list: Story[]): Story[] {
    stories[projectId] = list
    persist()
    return list
  },

  // ── Implementation: tech stack (project-level config) ──
  getTechStack(projectId: string): TechStack | null {
    return techStacks[projectId] ?? null
  },
  saveTechStack(stack: TechStack): TechStack {
    techStacks[stack.projectId] = stack
    persist()
    return stack
  },

  // ── Implementation: generated code (per story) ──
  getCode(storyId: string): GeneratedCode | null {
    return generatedCode[storyId] ?? null
  },
  saveCode(code: GeneratedCode): GeneratedCode {
    generatedCode[code.storyId] = code
    persist()
    return code
  },

  // ── Implementation: repository connection (one per project) ──
  getRepo(projectId: string): RepoConnection | null {
    return repoConnections[projectId] ?? null
  },
  saveRepo(repo: RepoConnection): RepoConnection {
    repoConnections[repo.projectId] = repo
    persist()
    return repo
  },

  // ── Change-impact alerts (project-wide, never deleted) ──
  getAlerts(projectId: string): ChangeImpactAlert[] {
    return alerts[projectId] ?? []
  },
  saveAlerts(projectId: string, list: ChangeImpactAlert[]): ChangeImpactAlert[] {
    alerts[projectId] = list
    persist()
    return list
  },

  // ── Audit trail (append-only) ──
  getAudit(projectId: string): AuditEntry[] {
    return audit[projectId] ?? []
  },
  appendAudit(projectId: string, entries: AuditEntry[]): AuditEntry[] {
    audit[projectId] = [...entries, ...(audit[projectId] ?? [])]
    persist()
    return audit[projectId]
  },

  // ── Implementation: design assets ──
  getDesignAssets(projectId: string): DesignAssets | null {
    return designAssets[projectId] ?? null
  },
  saveDesignAssets(assets: DesignAssets): DesignAssets {
    designAssets[assets.projectId] = assets
    persist()
    return assets
  },

  // ── Implementation: database schema ──
  getDbSchema(projectId: string): DbSchema | null {
    return dbSchemas[projectId] ?? null
  },
  saveDbSchema(schema: DbSchema): DbSchema {
    dbSchemas[schema.projectId] = schema
    persist()
    return schema
  },

  // ── Implementation: setup wizard state ──
  getImplementationSetup(projectId: string): ImplementationSetup {
    return (
      implementationSetup[projectId] ?? { projectId, wizardDismissed: false, scaffoldStatus: 'not-started' }
    )
  },
  saveImplementationSetup(setup: ImplementationSetup): ImplementationSetup {
    implementationSetup[setup.projectId] = setup
    persist()
    return setup
  },

  // ── Test: test cases (project-wide, across implemented stories) ──
  getTestCases(projectId: string): TestCase[] {
    return testCases[projectId] ?? []
  },
  saveTestCases(projectId: string, list: TestCase[]): TestCase[] {
    testCases[projectId] = list
    persist()
    return list
  },
}
