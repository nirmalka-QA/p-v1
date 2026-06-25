// Domain types this feature works with, re-exported from the shared model.
export type {
  Story,
  StoryStatus,
  ProjectType,
  AnalysisStep,
  TechStack,
  TechStackItem,
  GeneratedCode,
  GeneratedFile,
  RepoConnection,
  RepoProvider,
  RepoFile,
  DesignAssets,
  DesignReferenceLink,
  DesignReferenceCategory,
  DbSchema,
  SchemaTable,
  SchemaColumn,
  ImplementationSectionId,
  SetupStatus,
  DevelopMode,
  ImplementationSetup,
  UploadedFile,
} from '../../../../types'

/** Which main panel the legacy single-page Implementation view shows (pre-sections). */
export type ImplementationView = 'stack' | 'repo'

/** Payload for saving the repository configuration from the setup wizard. */
export interface SaveRepoConfigInput {
  projectId: string
  projectName: string
  provider: import('../../../../types').RepoProvider
  organisation: string
  repoName: string
  defaultBranch: string
  isMonorepo: boolean
  frontendPath?: string
  backendPath?: string
}

/** Payload for connecting a real GitHub repo with a Personal Access Token (ADR-0022). */
export interface ConnectGithubInput {
  projectId: string
  token: string
  owner: string
  repo: string
  branch?: string
  isMonorepo?: boolean
  frontendPath?: string
  backendPath?: string
}

/** Payload for persisting design-system assets. */
export interface SaveDesignAssetsInput {
  projectId: string
  patch: Partial<import('../../../../types').DesignAssets>
}

/** Which side of the stack to generate / read. */
export type CodeScope = 'frontend' | 'backend' | 'fullstack'

/** Payload for (re)generating code for a single story + scope. */
export interface GenerateCodeInput {
  projectId: string
  storyId: string
  scope?: CodeScope
}

/** Which side the technical specification is authored for. */
export type TechSpecScope = 'frontend' | 'backend'

/** One technical-requirement section (the project's technical specification; ADR-0024). */
export interface TechnicalRequirement {
  id: string
  scope: string
  title: string
  content: string
  position: number
}

export interface TechnicalRequirementsInput {
  projectId: string
  scope: TechSpecScope
}

export interface SaveTechnicalRequirementsInput {
  projectId: string
  scope: TechSpecScope
  items: { title: string; content: string }[]
}

/** Identifies one story's latest generated code for a scope (code generation is project-scoped). */
export interface GeneratedCodeInput {
  projectId: string
  storyId: string
  scope?: CodeScope
}

/** One progress step reported by the backend during generate-code, with start/end times. */
export interface CodeGenStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  endedAt?: string | null
}

/** Progressive status of an async generate-code job (mirrors Discovery / Planning / Features). */
/** One build/test step (install/build/test) that ran on the generated code (ADR-0022 P3). */
export interface BuildStep {
  name: string
  ok: boolean
  output: string
}

/** Build + test outcome for the generated code. */
export interface BuildReport {
  status: 'passed' | 'failed' | 'skipped'
  summary: string
  steps: BuildStep[]
}

/** Persisted last real-repo generation for a story + scope (ADR-0022). */
export interface StoryRepoCommit {
  storyId: string
  scope: string
  branch?: string | null
  prUrl?: string | null
  build?: BuildReport | null
  files: string[]
  committedAt: string
}

export interface CodeGenerationStatus {
  jobId: string
  status: 'running' | 'completed' | 'failed' | 'blocked'
  steps: CodeGenStep[]
  /** Reason when status is 'blocked' (e.g. scaffold required). */
  message?: string | null
  code?: import('../../../../types').GeneratedCode | null
  /** Real-repo path (ADR-0022): the pushed branch + opened pull-request URL. */
  branch?: string | null
  prUrl?: string | null
  /** Build + test report for the generated code (ADR-0022 P3). */
  build?: BuildReport | null
}

/** Payload for persisting tech-stack overrides. */
export interface UpdateTechStackInput {
  projectId: string
  items: import('../../../../types').TechStackItem[]
}

/** Payload for fetching one repository file's contents. */
export interface RepoFileInput {
  projectId: string
  path: string
}

/** A repository file's resolved contents, ready for the read-only viewer. */
export interface RepoFileContent {
  path: string
  language: string
  content: string
}

/** One piece of work the plan defers to a future story (ADR-0027). */
export interface PlanDeferredItem {
  title: string
  reason: string
  dependsOn: string[]
}

/** AI implementation plan for a story+scope (ADR-0027), shown for approval before generation. */
export interface ImplementationPlan {
  id: string
  story: string
  scope: string
  status: 'proposed' | 'approved' | 'implementing' | 'pushed' | 'pr_open' | 'failed' | 'superseded'
  summary: string
  willBuild: string[]
  filesToTouch: string[]
  reuse: string[]
  deferred: PlanDeferredItem[]
  createdAt: string
}

/** One development-memory item (ADR-0027): decision | migration | memory | deferred. */
export interface DevMemoryItem {
  id: string
  kind: 'memory' | 'decision' | 'migration' | 'deferred' | 'commit'
  scope: string
  title: string
  content: string
  /** Originating story slug (US-001…), or null for project-level notes. */
  story?: string | null
  /** Related story slugs — for a deferred item, its suggested dependencies. */
  relatedSlugs: string[]
  /** When a deferred item has been promoted into a story, that story's slug. */
  promotedStorySlug?: string | null
  createdAt: string
}
