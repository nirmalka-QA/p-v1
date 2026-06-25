/** RTK Query cache tag types — single source of truth. */
export const API_TAGS = {
  Workspace: 'Workspace',
  WorkspaceMember: 'WorkspaceMember',
  Artifact: 'Artifact',
  Dashboard: 'Dashboard',
  AdminUser: 'AdminUser',
  Profile: 'Profile',
  Project: 'Project',
  ProjectType: 'ProjectType',
  Strategy: 'Strategy',
  StrategyTemplate: 'StrategyTemplate',
  PhaseState: 'PhaseState',
  KnowledgeBase: 'KnowledgeBase',
  Upload: 'Upload',
  Feature: 'Feature',
  Story: 'Story',
  TechStack: 'TechStack',
  Repo: 'Repo',
  TestCase: 'TestCase',
  Impact: 'Impact',
  Audit: 'Audit',
  Design: 'Design',
  Setup: 'Setup',
  TechnicalRequirements: 'TechnicalRequirements',
} as const

export type ApiTag = (typeof API_TAGS)[keyof typeof API_TAGS]

/** Tag list passed to `createApi({ tagTypes })`. */
export const API_TAG_LIST = Object.values(API_TAGS) as ApiTag[]

/** Special list-tag id used for collection-level cache invalidation. */
export const LIST_ID = 'LIST'

/** Default pagination for list queries. */
export const DEFAULT_PAGE_NUMBER = 1
export const DEFAULT_PAGE_SIZE = 20

/** API endpoint paths (appended to the Function base URL). */
export const API_ENDPOINTS = {
  // Workspaces (flat routing ADR — workspace scoping for projects is a request
  // field, not a URL segment). Mock-first; no live backend yet.
  workspacesList: 'workspaces-list', // POST (paginated/searchable list)
  workspaces: 'workspaces', // POST (create)
  workspace: (id: string) => `workspaces/${id}`, // GET / PATCH / DELETE
  workspaceMembers: (id: string) => `workspaces/${id}/members`, // GET / POST (invite)
  workspaceMember: (id: string, memberId: string) => `workspaces/${id}/members/${memberId}`, // PATCH (role) / DELETE
  workspaceArtifacts: (id: string) => `workspaces/${id}/artifacts`, // GET / POST (upload)
  workspaceArtifact: (id: string, artifactId: string) => `workspaces/${id}/artifacts/${artifactId}`, // DELETE
  dashboardStats: 'dashboard/stats', // GET (org-wide admin aggregates)

  // Platform admin console (host-only, platformAdmin-gated; mock-first, no live backend yet).
  adminUsers: 'admin/users', // GET (every user across all workspaces + platform attributes)
  adminUserPlatformRole: (userId: string) => `admin/users/${userId}/platform-role`, // PATCH (grant/revoke platformAdmin)
  adminUserStatus: (userId: string) => `admin/users/${userId}/status`, // PATCH (activate/deactivate)
  adminUserSignOut: (userId: string) => `admin/users/${userId}/sign-out`, // POST (force sign-out of all sessions)

  // Profile (the authenticated user's own profile + project history; mock-first).
  profile: 'me', // GET (current user's profile details)
  profileProjects: 'me/projects', // GET ?status=active|closed (projects the user has worked on)
  profileAvatar: 'me/avatar', // POST (multipart `file` → { avatarUrl }) / DELETE (remove)

  projectsList: 'projects-list', // GET (paginated list)
  projects: 'projects', // POST (create)
  project: (id: string) => `projects/${id}`,
  projectTypes: 'project-types', // GET (industry master data — legacy/future)
  projectTypeCatalog: 'project-type-catalog', // GET (federation project-type master data + availability)
  // Strategy module — namespaced under /strategy so the module owns its url (nginx routes /api/strategy/* → module).
  // Project-type registry → Strategy template management (platform Settings › Project-type registry › Strategy).
  // Tenant-owned strategy templates: full CRUD; system templates are read-only (duplicate to customise).
  // Maps to the strategy module's StrategyTemplateController; mock-first until the registry UI wiring lands.
  registryStrategyTemplates: 'strategy/strategy-templates', // GET (list system + tenant defs, rich config) / POST (create tenant)
  registryStrategyTemplate: (id: number | string) => `strategy/strategy-templates/${id}`, // PUT (update tenant) / DELETE (delete tenant)
  registryStrategyTemplateDuplicate: (id: number | string) => `strategy/strategy-templates/${id}/duplicate`, // POST (clone any template into an editable tenant copy)
  strategyTypes: 'strategy/strategy-types', // GET (strategy templates + their ordered phase ids)
  strategyPhases: 'strategy/strategy-phases', // GET (strategy phase library — shared by wizard + strategy remote)
  phaseState: (id: string) => `strategy/projects/${id}/phase-state`, // GET / PATCH (strategy per-phase progress)
  strategyProjectPhases: (id: string) => `strategy/projects/${id}/phases`, // GET (ordered phases WITH config + progress — the capability-owned rail)
  // Strategy runtime (live backend): snapshot a chosen/built strategy onto a project, then drive it.
  strategyInstantiate: (id: string) => `strategy/projects/${id}/instantiate`, // POST { strategyTemplateId } | { phases }
  strategyStatus: (id: string) => `strategy/projects/${id}/status`, // GET (lifecycle + sign-off readiness)
  strategySignOff: (id: string) => `strategy/projects/${id}/sign-off`, // POST (Executive Sign-off)
  strategyPhaseInput: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/inputs`, // POST (multipart upload)
  strategyPhaseAdditionalDoc: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/additional-docs`, // POST (multipart — free-form additional doc, no slot validation)
  strategyPhaseAdditionalDocDownload: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/additional-docs/download`, // GET ?blobName= (stream raw bytes)
  strategyGenerate: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/generate`, // POST { output } → { operationId } (async op, Phase 10)
  strategyGenerateFinalize: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/generate/finalize`, // POST { output, operationId } (store + mark on success)
  strategyGenerateKb: (id: string, phaseId: string) => `strategy/projects/${id}/phases/${phaseId}/generate-kb`, // POST → { operationId } (build the discovery KB + open questions, ADR-0074)
  strategyKb: (id: string) => `strategy/projects/${id}/kb`, // GET → { sections:[{id,label,description,notes}], lastGeneratedAt } (the discovery KB, ADR-0074)

  // Discovery (Requirements module — namespaced under /requirements; base URL already ends in /api)
  kb: (projectId: string) => `requirements/projects/${projectId}/kb`, // GET
  generateKb: (projectId: string) => `requirements/projects/${projectId}/generate-kb`, // POST (legacy sync)
  generateKbStart: (projectId: string) => `requirements/projects/${projectId}/generate-kb/start`, // POST (progressive)
  kbStatus: (projectId: string, jobId: string) => `requirements/projects/${projectId}/generate-kb/status/${jobId}`, // GET (poll)
  uploads: (projectId: string) => `requirements/projects/${projectId}/uploads`, // GET, POST (multipart)
  upload: (projectId: string, fileId: string) => `requirements/projects/${projectId}/uploads/${fileId}`, // DELETE

  // Planning (backend ready; ResponseDto<PlanDto> envelope, base URL ends in /api)
  plan: (projectId: string) => `projects/${projectId}/plan`, // GET (PlanningPlan | null)
  generateFeatures: (projectId: string) => `projects/${projectId}/generate-features`, // POST (sync)
  generateFeaturesStart: (projectId: string) => `projects/${projectId}/generate-features/start`, // POST (progressive)
  featuresStatus: (projectId: string, jobId: string) => `projects/${projectId}/generate-features/status/${jobId}`, // GET (poll)
  features: (projectId: string) => `projects/${projectId}/features`, // POST (add)
  feature: (projectId: string, featureId: string) => `projects/${projectId}/features/${featureId}`, // PATCH / DELETE(archive)
  reorderFeatures: (projectId: string) => `projects/${projectId}/features/reorder`, // PATCH (full ordered list)
  approveFeatures: (projectId: string) => `projects/${projectId}/features/approve`, // POST
  enhanceFeature: (projectId: string, featureId: string) => `projects/${projectId}/features/${featureId}/enhance`, // POST
  acceptSuggestion: (projectId: string, suggestionId: string) => `projects/${projectId}/suggestions/${suggestionId}/accept`, // POST
  dismissSuggestion: (projectId: string, suggestionId: string) => `projects/${projectId}/suggestions/${suggestionId}/dismiss`, // POST

  // Features (stories) phase — backend ready; ResponseDto<Story[]> envelope, base URL ends in /api
  stories: (projectId: string) => `projects/${projectId}/stories`, // GET (project-wide)
  featureStories: (projectId: string, featureId: string) => `projects/${projectId}/features/${featureId}/stories`, // POST (add)
  generateStoriesStart: (projectId: string) => `projects/${projectId}/generate-stories/start`, // POST (progressive; featureIds optional)
  storiesGenStatus: (projectId: string, jobId: string) => `projects/${projectId}/generate-stories/status/${jobId}`, // GET (poll)
  generateStoriesPlan: (projectId: string) => `projects/${projectId}/generate-stories/plan`, // POST (target features, ordered)
  generateFeatureStories: (projectId: string, featureSlug: string) => `projects/${projectId}/features/${featureSlug}/generate-stories`, // POST (one feature, sync)
  story: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}`, // PATCH / DELETE(archive)
  setStoriesStatus: (projectId: string) => `projects/${projectId}/stories/status`, // PATCH (bulk)
  dismissStoryImpact: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/dismiss-impact`, // POST
  enhanceStoryApi: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/enhance`, // POST
  analyzeDependencies: (projectId: string) => `projects/${projectId}/analyze-dependencies`, // POST (AI suggestions)
  rejectDependency: (projectId: string) => `projects/${projectId}/dependencies/reject`, // POST { kind, source, dependsOn }
  featureDependencies: (projectId: string, featureSlug: string) => `projects/${projectId}/features/${featureSlug}/dependencies`, // POST { dependsOn }
  featureDependency: (projectId: string, featureSlug: string, dependsOnSlug: string) => `projects/${projectId}/features/${featureSlug}/dependencies/${dependsOnSlug}`, // DELETE

  // Implementation phase
  techStack: (id: string) => `projects/${id}/tech-stack`, // GET / PATCH
  suggestTechStack: (id: string) => `projects/${id}/suggest-tech-stack`, // POST
  // Code generation is project-scoped (slugs are unique per project, not globally).
  generatedCode: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/code`, // GET (latest)
  generateCode: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/generate-code`, // POST (sync)
  generateCodeStart: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/generate-code/start`, // POST (progressive)
  codeGenStatus: (projectId: string, jobId: string) => `projects/${projectId}/generate-code/status/${jobId}`, // GET (poll)
  generateToRepoStart: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/generate-to-repo/start`, // POST (real repo + PR)
  generateToRepoIterate: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/generate-to-repo/iterate`, // POST (modify PR)
  repoCommitStatus: (projectId: string, jobId: string) => `projects/${projectId}/generate-to-repo/status/${jobId}`, // GET (poll)
  openPr: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/open-pr`, // POST ?scope= (ADR-0027 manual PR to develop)
  devMemory: (projectId: string) => `projects/${projectId}/dev-memory`, // GET ?kind= (ADR-0027 implementation log)
  createStoryFromDeferred: (projectId: string, devMemoryId: string) => `projects/${projectId}/deferred/${devMemoryId}/create-story`, // POST (ADR-0027)
  planImplementation: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/plan-implementation`, // POST ?scope= (ADR-0027)
  implementationPlan: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/implementation-plan`, // GET ?scope=
  approveImplementationPlan: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/implementation-plan/approve`, // POST ?scope=
  storyRepoCommit: (projectId: string, storyId: string) => `projects/${projectId}/stories/${storyId}/repo-commit`, // GET ?scope= (persisted last run)
  repo: (id: string) => `projects/${id}/repo`, // GET (connection + tree) / PATCH (config)
  repoConnectGithub: (id: string) => `projects/${id}/repo/connect-github`, // POST (PAT connect, real tree)
  repoFile: (id: string) => `projects/${id}/repo/file`, // GET ?path=
  repoBranches: (id: string) => `projects/${id}/repo/branches`, // GET (branch names)
  repoBranch: (id: string) => `projects/${id}/repo/branch`, // POST { branch } — switch + sync tree
  designAssets: (id: string) => `projects/${id}/design`, // GET / PATCH
  aiInstructions: (id: string) => `projects/${id}/ai-instructions`, // POST (generate)
  technicalRequirements: (id: string) => `projects/${id}/technical-requirements`, // GET / PUT
  generateTechnicalRequirements: (id: string) => `projects/${id}/technical-requirements/generate`, // POST
  schema: (id: string) => `projects/${id}/schema`, // GET / POST (generate)
  setupState: (id: string) => `projects/${id}/implementation-setup`, // GET / PATCH
  scaffoldStart: (id: string) => `projects/${id}/scaffold/start`, // POST (initial scaffold → develop)
  scaffoldStatus: (id: string, jobId: string) => `projects/${id}/scaffold/status/${jobId}`, // GET (poll)

  // Test phase (ADR-0028; live backend, base URL ends in /api, ResponseDto<TestCase[]> envelope)
  testsList: (projectId: string) => `projects/${projectId}/tests`, // GET (project-wide)
  storyTests: (projectId: string, storySlug: string) => `projects/${projectId}/stories/${storySlug}/tests`, // POST (add)
  generateTests: (projectId: string, storySlug: string) => `projects/${projectId}/stories/${storySlug}/generate-tests`, // POST (sync AI)
  generateTestsStart: (projectId: string, storySlug: string) => `projects/${projectId}/stories/${storySlug}/generate-tests/start`, // POST (progressive)
  testsGenStatus: (projectId: string, jobId: string) => `projects/${projectId}/generate-tests/status/${jobId}`, // GET (poll)
  test: (projectId: string, testSlug: string) => `projects/${projectId}/tests/${testSlug}`, // PATCH / DELETE

  // Async operations (Phase 10 / ADR-0072) — a module's durable operation progress edge. `module` is the route
  // prefix the operation runs under (e.g. 'requirements', 'strategy'); reached via nginx /api/{module}/operations/…
  operation: (module: string, operationId: string) => `${module}/operations/${operationId}`, // GET (poll, ?sinceSeq)
  operationStream: (module: string, operationId: string) => `${module}/operations/${operationId}/stream`, // GET (SSE)
  operationCancel: (module: string, operationId: string) => `${module}/operations/${operationId}/cancel`, // POST
} as const
