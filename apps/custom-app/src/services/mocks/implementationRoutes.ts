import type { MockRoute } from '@wispr/services'
import { mockDb } from '../mockDb'
import {
  buildSuggestedStack,
  reconcileSuggestedFlags,
} from '../../features/implementation/utility/helpers/mockTechStack'
import { generateMockCode } from '../../features/implementation/utility/helpers/mockCode'
import {
  buildRepoConnection,
  repoFileContent,
} from '../../features/implementation/utility/helpers/mockRepo'
import {
  buildAiInstructions,
  type AiInstructionFormat,
  type Convention,
} from '../../features/implementation/utility/helpers/mockAiInstructions'
import type {
  ProjectType,
  Story,
  GeneratedCode,
  RepoConnection,
  DesignAssets,
  TechStackItem,
} from '../../types'
import type {
  ImplementationPlan,
  StoryRepoCommit,
  TechnicalRequirement,
  DevMemoryItem,
  BuildReport,
} from '../../features/implementation/utility/models/model'
import { nextStoryId } from '../../features/features/utility/helpers/helpers'
import { startJob, pollJob } from './jobs'
import { extraState, persistExtra } from './extraState'
import { ok, fail, nextId, nowIso } from './shared'

/**
 * Implementation-phase mock routes. Ports the pre-live mock behaviour (tech
 * stack, virtual code generation, repo viewer, design assets, AI instructions)
 * onto the live URL contract, and simulates the ADR-0022…0028 additions: repo
 * generation with PRs and build reports, implementation plans, technical
 * requirements, development memory, and the initial scaffold.
 */

const CODE_STEPS = [
  { key: 'context', label: 'Reading story, tech stack & instructions' },
  { key: 'plan', label: 'Planning files and structure' },
  { key: 'generate', label: 'Generating code' },
  { key: 'review', label: 'Self-reviewing the diff' },
  { key: 'finalise', label: 'Finalising output' },
]

const REPO_STEPS = [
  { key: 'context', label: 'Reading story & repository state' },
  { key: 'branch', label: 'Creating the feature branch' },
  { key: 'generate', label: 'Generating and committing code' },
  { key: 'build', label: 'Running install · build · test' },
  { key: 'push', label: 'Pushing the branch' },
]

const SCAFFOLD_STEPS = [
  { key: 'plan', label: 'Planning the project scaffold' },
  { key: 'generate', label: 'Generating the base project' },
  { key: 'build', label: 'Verifying the scaffold builds' },
  { key: 'push', label: 'Pushing to develop' },
]

const scope = (query: Record<string, unknown>): string => String(query['scope'] ?? 'fullstack')

const codeKey = (projectId: string, scopeName: string, storyId: string) =>
  `${projectId}/${scopeName}/${storyId}`

/** Generated code is stored per project + scope + story (composite mockDb key). */
function readCode(projectId: string, scopeName: string, storyId: string): GeneratedCode | null {
  const stored = mockDb.getCode(codeKey(projectId, scopeName, storyId))
  return stored ? { ...stored, storyId } : null
}

function writeCode(projectId: string, scopeName: string, code: GeneratedCode): GeneratedCode {
  mockDb.saveCode({ ...code, storyId: codeKey(projectId, scopeName, code.storyId) })
  return code
}

function findStory(projectId: string, storyId: string): Story | undefined {
  return mockDb.getStories(projectId).find((s) => s.id === storyId)
}

function generateCodeFor(projectId: string, scopeName: string, storyId: string): GeneratedCode {
  const story = findStory(projectId, storyId)
  if (!story) throw new Error('Story not found.')
  const stack = mockDb.getTechStack(projectId)?.items ?? []
  return writeCode(projectId, scopeName, generateMockCode(story, stack, nowIso()))
}

const passingBuild = (): BuildReport => ({
  status: 'passed',
  summary: 'Install, build and tests all passed.',
  steps: [
    { name: 'npm install', ok: true, output: 'added 412 packages in 8s' },
    { name: 'npm run build', ok: true, output: 'build completed — 0 errors, 0 warnings' },
    { name: 'npm test', ok: true, output: 'Test suites: 6 passed · Tests: 38 passed' },
  ],
})

function appendDevMemory(projectId: string, items: Omit<DevMemoryItem, 'id' | 'createdAt'>[]): void {
  const list = extraState.devMemory[projectId] ?? []
  const stamped = items.map((item): DevMemoryItem => ({ ...item, id: nextId('mem'), createdAt: nowIso() }))
  extraState.devMemory[projectId] = [...stamped, ...list]
  persistExtra()
}

const planKey = (projectId: string, scopeName: string, storyId: string) =>
  `${projectId}:${scopeName}:${storyId}`

/** Simulated repo generation: code + branch + build report + memory entries. */
function commitToRepo(projectId: string, scopeName: string, storyId: string): Record<string, unknown> {
  const story = findStory(projectId, storyId)
  if (!story) throw new Error('Story not found.')
  const code = generateCodeFor(projectId, scopeName, storyId)
  const branch = `feature/${storyId.toLowerCase()}-${scopeName}`
  const build = passingBuild()

  const commit: StoryRepoCommit = {
    storyId,
    scope: scopeName,
    branch,
    prUrl: null,
    build,
    files: code.files.map((f) => f.filename),
    committedAt: nowIso(),
  }
  extraState.repoCommits[planKey(projectId, scopeName, storyId)] = commit

  const plan = extraState.implementationPlans[planKey(projectId, scopeName, storyId)]
  if (plan) extraState.implementationPlans[planKey(projectId, scopeName, storyId)] = { ...plan, status: 'pushed' }
  persistExtra()

  appendDevMemory(projectId, [
    {
      kind: 'commit',
      scope: scopeName,
      title: `Pushed ${branch}`,
      content: `Generated ${code.files.length} file(s) for “${story.title}” and pushed ${branch}. Build and tests passed.`,
      story: storyId,
      relatedSlugs: [],
    },
    {
      kind: 'decision',
      scope: scopeName,
      title: `Component structure for ${storyId}`,
      content:
        'Followed the feature-folder convention: page entry + co-located components, with service calls isolated in the data layer.',
      story: storyId,
      relatedSlugs: [],
    },
  ])

  return { code, branch, prUrl: null, build }
}

/** Plausible file paths for the implementation plan, derived from the story. */
function plannedFiles(story: Story, scopeName: string): string[] {
  const slug = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  if (scopeName === 'backend') {
    return [
      `src/api/${slug}/controller.ts`,
      `src/api/${slug}/service.ts`,
      `src/api/${slug}/repository.ts`,
      `src/api/${slug}/dto.ts`,
    ]
  }
  return [
    `src/features/${slug}/${slug}-page.tsx`,
    `src/features/${slug}/components/${slug}-form.tsx`,
    `src/features/${slug}/hooks/use-${slug}.ts`,
    `src/services/${slug}-api.ts`,
  ]
}

const FRONTEND_REQUIREMENTS: { title: string; content: (stack: TechStackItem[]) => string }[] = [
  {
    title: 'Architecture & state management',
    content: (stack) =>
      `Feature-folder architecture with one page entry per route. Server state lives in the data layer (${
        stack.find((s) => s.category.toLowerCase().includes('state'))?.value ?? 'RTK Query'
      }); UI state stays local to components. No business logic inside reusable components.`,
  },
  {
    title: 'Component standards',
    content: () =>
      'Use the shared design-system components first; never rebuild an existing pattern. Each component lives in its own folder with co-located styles. Props stay narrow and typed — no `any`.',
  },
  {
    title: 'API integration',
    content: () =>
      'All HTTP calls go through the generated API client with the shared error envelope. Every async surface implements loading, error and empty states; failures surface human-readable messages.',
  },
  {
    title: 'Accessibility & performance',
    content: () =>
      'WCAG 2.1 AA: focus management on dialogs, labelled inputs, 4.5:1 contrast. Code-split routes, memoise expensive lists, and keep the initial bundle under 250 KB gzipped.',
  },
  {
    title: 'Testing strategy',
    content: () =>
      'Unit-test pure logic and hooks; component-test critical flows (happy + error paths). Integration tests cover each phase gate. Coverage target: 80% on changed lines.',
  },
]

const BACKEND_REQUIREMENTS: { title: string; content: (stack: TechStackItem[]) => string }[] = [
  {
    title: 'Service architecture',
    content: (stack) =>
      `Layered service design (controller → service → repository) on ${
        stack.find((s) => s.category.toLowerCase().includes('backend'))?.value ?? 'the chosen runtime'
      }. Domain logic stays in services; controllers translate transport concerns only.`,
  },
  {
    title: 'API design & versioning',
    content: () =>
      'REST resources with the standard response envelope ({ success, data, message }). Breaking changes require a new version prefix; additive changes are backwards-compatible.',
  },
  {
    title: 'Data & persistence',
    content: (stack) =>
      `Schema migrations are versioned and reversible (${
        stack.find((s) => s.category.toLowerCase().includes('database'))?.value ?? 'the project database'
      }). Every table carries created/updated audit columns; soft-delete via archived flags.`,
  },
  {
    title: 'Security & compliance',
    content: () =>
      'OIDC bearer tokens validated on every request; role checks at the service layer. Secrets only from the environment/key vault. Input validation at the boundary; parameterised queries everywhere.',
  },
  {
    title: 'Observability & testing',
    content: () =>
      'Structured logs with correlation ids, request metrics, and health probes. Unit tests on services, contract tests on the API surface; CI gates merges on green.',
  },
]

function generateRequirements(projectId: string, scopeName: string): TechnicalRequirement[] {
  const stack = mockDb.getTechStack(projectId)?.items ?? []
  const source = scopeName === 'backend' ? BACKEND_REQUIREMENTS : FRONTEND_REQUIREMENTS
  const items = source.map(
    (req, index): TechnicalRequirement => ({
      id: nextId('tr'),
      scope: scopeName,
      title: req.title,
      content: req.content(stack),
      position: index,
    }),
  )
  extraState.technicalRequirements[`${projectId}:${scopeName}`] = items
  persistExtra()
  return items
}

const readDesign = (projectId: string): DesignAssets =>
  mockDb.getDesignAssets(projectId) ?? { projectId, hasFigmaToken: false, uploads: [] }

export const implementationRoutes: MockRoute[] = [
  // ── Tech stack ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/tech-stack',
    handler: ({ params }) => ok(mockDb.getTechStack(params['projectId'] ?? '')),
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/suggest-tech-stack',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const { type } = (body ?? {}) as { type?: ProjectType }
      return ok(mockDb.saveTechStack({ projectId, items: buildSuggestedStack(type ?? 'other') }))
    },
  },
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/tech-stack',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const { items } = (body ?? {}) as { items?: TechStackItem[] }
      return ok(
        mockDb.saveTechStack({ projectId, items: reconcileSuggestedFlags(items ?? [], 'other') }),
      )
    },
  },

  // ── Virtual code generation (per story + scope) ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/stories/:storyId/code',
    handler: ({ params, query }) =>
      ok(readCode(params['projectId'] ?? '', scope(query), params['storyId'] ?? '')),
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/generate-code',
    handler: ({ params, query }) => {
      try {
        return ok(generateCodeFor(params['projectId'] ?? '', scope(query), params['storyId'] ?? ''))
      } catch (error) {
        return fail(404, error instanceof Error ? error.message : 'Story not found.')
      }
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/generate-code/start',
    handler: ({ params, query }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const scopeName = scope(query)
      if (!findStory(projectId, storyId)) return fail(404, 'Story not found.')
      return ok(
        startJob(CODE_STEPS, () => ({ code: generateCodeFor(projectId, scopeName, storyId) })),
      )
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/generate-code/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },

  // ── Repo generation (ADR-0022/0027): branch + build report + PR ──
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/generate-to-repo/start',
    handler: ({ params, query }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const scopeName = scope(query)
      if (!mockDb.getRepo(projectId)) return fail(400, 'Connect a repository first.')
      if (mockDb.getImplementationSetup(projectId).scaffoldStatus !== 'ready') {
        return ok({
          jobId: '',
          status: 'blocked',
          steps: [],
          message: 'Run the initial scaffold first — the repo has no base project to build on.',
        })
      }
      return ok(startJob(REPO_STEPS, () => commitToRepo(projectId, scopeName, storyId)))
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/generate-to-repo/iterate',
    handler: ({ params, query }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const scopeName = scope(query)
      const existing = extraState.repoCommits[planKey(projectId, scopeName, storyId)]
      if (!existing) return fail(400, 'Nothing to iterate on — generate into the repo first.')
      return ok(startJob(REPO_STEPS, () => commitToRepo(projectId, scopeName, storyId)))
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/generate-to-repo/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/open-pr',
    handler: ({ params, query }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const scopeName = scope(query)
      const key = planKey(projectId, scopeName, storyId)
      const commit = extraState.repoCommits[key]
      if (!commit) return fail(400, 'Push a branch first — there is nothing to open a PR for.')

      const repoName = mockDb.getRepo(projectId)?.repoName ?? 'wispr-app'
      const prUrl = `https://github.com/wispr-demo/${repoName.split('/').pop()}/pull/${
        Object.keys(extraState.repoCommits).length + 7
      }`
      extraState.repoCommits[key] = { ...commit, prUrl }
      const plan = extraState.implementationPlans[key]
      if (plan) extraState.implementationPlans[key] = { ...plan, status: 'pr_open' }
      persistExtra()

      return ok({
        jobId: nextId('pr'),
        status: 'completed',
        steps: [],
        branch: commit.branch,
        prUrl,
        build: commit.build,
      })
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/stories/:storyId/repo-commit',
    handler: ({ params, query }) =>
      ok(
        extraState.repoCommits[
          planKey(params['projectId'] ?? '', scope(query), params['storyId'] ?? '')
        ] ?? null,
      ),
  },

  // ── Implementation plans (ADR-0027 approval gate) ──
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/plan-implementation',
    handler: ({ params, query }) => {
      const projectId = params['projectId'] ?? ''
      const storyId = params['storyId'] ?? ''
      const scopeName = scope(query)
      const story = findStory(projectId, storyId)
      if (!story) return fail(404, 'Story not found.')

      const plan: ImplementationPlan = {
        id: nextId('plan'),
        story: storyId,
        scope: scopeName,
        status: 'proposed',
        summary: `Implement “${story.title}” end to end: ${story.iWant || story.description || 'the story’s acceptance criteria'}, wired to the existing data layer with full loading/error/empty states.`,
        willBuild: (story.acceptanceCriteria.length
          ? story.acceptanceCriteria.map((c) => c.title || `${c.when} → ${c.then}`)
          : [story.description || story.title]
        ).slice(0, 5),
        filesToTouch: plannedFiles(story, scopeName),
        reuse: [
          'Shared UI components (design system) for forms, tables and feedback states',
          'The generated API client + standard response envelope',
          'Existing auth context and route guards',
        ],
        deferred: (story.risks ?? []).slice(0, 1).map((risk) => ({
          title: `Mitigate: ${risk}`,
          reason: 'Out of scope for the first pass; tracked as deferred work.',
          dependsOn: [storyId],
        })),
        createdAt: nowIso(),
      }
      extraState.implementationPlans[planKey(projectId, scopeName, storyId)] = plan
      persistExtra()
      return ok(plan)
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/stories/:storyId/implementation-plan',
    handler: ({ params, query }) =>
      ok(
        extraState.implementationPlans[
          planKey(params['projectId'] ?? '', scope(query), params['storyId'] ?? '')
        ] ?? null,
      ),
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storyId/implementation-plan/approve',
    handler: ({ params, query }) => {
      const key = planKey(params['projectId'] ?? '', scope(query), params['storyId'] ?? '')
      const plan = extraState.implementationPlans[key]
      if (!plan) return fail(404, 'No implementation plan to approve.')
      const approved: ImplementationPlan = { ...plan, status: 'approved' }
      extraState.implementationPlans[key] = approved
      persistExtra()
      return ok(approved)
    },
  },

  // ── Development memory (ADR-0027/0028) ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/dev-memory',
    handler: ({ params, query }) => {
      let items = extraState.devMemory[params['projectId'] ?? ''] ?? []
      const kind = query['kind'] ? String(query['kind']) : null
      const storySlug = query['storySlug'] ? String(query['storySlug']) : null
      if (kind) items = items.filter((i) => i.kind === kind)
      if (storySlug) items = items.filter((i) => i.story === storySlug)
      return ok(items)
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/deferred/:devMemoryId/create-story',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const items = extraState.devMemory[projectId] ?? []
      const item = items.find((i) => i.id === params['devMemoryId'])
      if (!item) return fail(404, 'Deferred item not found.')

      const stories = mockDb.getStories(projectId)
      const origin = stories.find((s) => s.id === item.story)
      const newStory: Story = {
        id: nextStoryId(stories),
        featureId: origin?.featureId ?? stories[0]?.featureId ?? 'F-001',
        projectId,
        title: item.title,
        description: item.content,
        asA: origin?.asA ?? 'user',
        iWant: item.title,
        soThat: 'previously deferred work is completed',
        acceptanceCriteria: [],
        effort: 3,
        status: 'draft',
        dependencies: item.relatedSlugs.filter((slug) => stories.some((s) => s.id === slug)),
        impactedStories: [],
        impactDismissed: false,
        tags: ['deferred'],
        createdAt: nowIso(),
      }
      mockDb.saveStories(projectId, [...stories, newStory])
      extraState.devMemory[projectId] = items.map((i) =>
        i.id === item.id ? { ...i, promotedStorySlug: newStory.id } : i,
      )
      persistExtra()
      return ok(newStory.id)
    },
  },

  // ── Repository ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/repo',
    handler: ({ params }) => ok(mockDb.getRepo(params['projectId'] ?? '')),
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/repo',
    handler: ({ params, body }) => {
      const { projectName } = (body ?? {}) as { projectName?: string }
      return ok(
        mockDb.saveRepo(
          buildRepoConnection(params['projectId'] ?? '', projectName ?? 'wispr-app', nowIso()),
        ),
      )
    },
  },
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/repo',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const input = (body ?? {}) as Partial<RepoConnection> & { projectName?: string; defaultBranch?: string }
      const base =
        mockDb.getRepo(projectId) ??
        buildRepoConnection(projectId, input.projectName ?? 'wispr-app', nowIso())
      const repo: RepoConnection = {
        ...base,
        provider: input.provider ?? base.provider,
        organisation: input.organisation?.trim() || base.organisation,
        repoName: input.repoName?.trim() || base.repoName,
        branch: input.defaultBranch?.trim() || base.branch,
        isMonorepo: input.isMonorepo ?? base.isMonorepo,
        frontendPath: input.frontendPath?.trim() || base.frontendPath,
        backendPath: input.backendPath?.trim() || base.backendPath,
      }
      return ok(mockDb.saveRepo(repo))
    },
  },
  // GitHub connect (PAT) — the token is intentionally never stored.
  {
    method: 'POST',
    pattern: 'projects/:projectId/repo/connect-github',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const input = (body ?? {}) as {
        owner?: string
        repo?: string
        branch?: string
        isMonorepo?: boolean
        frontendPath?: string
        backendPath?: string
      }
      if (!input.owner || !input.repo) return fail(400, 'Repository owner and name are required.')
      const base = buildRepoConnection(projectId, input.repo, nowIso())
      const repo: RepoConnection = {
        ...base,
        provider: 'github',
        organisation: input.owner,
        repoName: `${input.owner}/${input.repo}`,
        branch: input.branch?.trim() || 'main',
        ...(input.isMonorepo !== undefined ? { isMonorepo: input.isMonorepo } : {}),
        ...(input.frontendPath ? { frontendPath: input.frontendPath } : {}),
        ...(input.backendPath ? { backendPath: input.backendPath } : {}),
      }
      return ok(mockDb.saveRepo(repo))
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/repo/file',
    handler: ({ query }) => {
      const path = String(query['path'] ?? '')
      const { language, content } = repoFileContent(path)
      return ok({ path, language, content })
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/repo/branches',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const repo = mockDb.getRepo(projectId)
      const fromCommits = Object.entries(extraState.repoCommits)
        .filter(([key]) => key.startsWith(`${projectId}:`))
        .map(([, commit]) => commit.branch)
        .filter((b): b is string => Boolean(b))
      return ok(Array.from(new Set([repo?.branch ?? 'main', 'develop', ...fromCommits])))
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/repo/branch',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const repo = mockDb.getRepo(projectId)
      if (!repo) return fail(404, 'No repository connected.')
      const { branch } = (body ?? {}) as { branch?: string }
      return ok(mockDb.saveRepo({ ...repo, branch: branch || repo.branch }))
    },
  },

  // ── Design system + AI instructions ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/design',
    handler: ({ params }) => ok(mockDb.getDesignAssets(params['projectId'] ?? '')),
  },
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/design',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const patch = (body ?? {}) as Partial<DesignAssets>
      return ok(mockDb.saveDesignAssets({ ...readDesign(projectId), ...patch, projectId }))
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/ai-instructions',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const input = (body ?? {}) as {
        projectName?: string
        format?: AiInstructionFormat
        conventions?: Convention[]
      }
      const existing = readDesign(projectId)
      const format = input.format ?? 'claude'
      const content = buildAiInstructions({
        projectName: input.projectName ?? 'WISPR project',
        techStack: mockDb.getTechStack(projectId)?.items ?? [],
        repo: mockDb.getRepo(projectId),
        designNotes: existing.notes,
        conventions: input.conventions ?? [],
        format,
      })
      return ok(
        mockDb.saveDesignAssets({
          ...existing,
          aiInstructionsContent: content,
          aiInstructionsFormat: format,
        }),
      )
    },
  },

  // ── Technical requirements (ADR-0024) ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/technical-requirements',
    handler: ({ params, query }) =>
      ok(extraState.technicalRequirements[`${params['projectId']}:${String(query['scope'] ?? 'frontend')}`] ?? []),
  },
  {
    method: 'PUT',
    pattern: 'projects/:projectId/technical-requirements',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const input = (body ?? {}) as { scope?: string; items?: { title: string; content: string }[] }
      const scopeName = input.scope ?? 'frontend'
      const items = (input.items ?? []).map(
        (item, index): TechnicalRequirement => ({
          id: nextId('tr'),
          scope: scopeName,
          title: item.title,
          content: item.content,
          position: index,
        }),
      )
      extraState.technicalRequirements[`${projectId}:${scopeName}`] = items
      persistExtra()
      return ok(items)
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/technical-requirements/generate',
    handler: ({ params, query }) =>
      ok(generateRequirements(params['projectId'] ?? '', String(query['scope'] ?? 'frontend'))),
  },

  // ── Setup wizard + initial scaffold (ADR-0025) ──
  {
    method: 'GET',
    pattern: 'projects/:projectId/implementation-setup',
    handler: ({ params }) => ok(mockDb.getImplementationSetup(params['projectId'] ?? '')),
  },
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/implementation-setup',
    handler: ({ params }) => {
      const setup = mockDb.getImplementationSetup(params['projectId'] ?? '')
      return ok(mockDb.saveImplementationSetup({ ...setup, wizardDismissed: true }))
    },
  },
  {
    method: 'POST',
    pattern: 'projects/:projectId/scaffold/start',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      if (!mockDb.getRepo(projectId)) return fail(400, 'Connect a repository before scaffolding.')
      const setup = mockDb.getImplementationSetup(projectId)
      mockDb.saveImplementationSetup({ ...setup, scaffoldStatus: 'in-progress' })
      return ok(
        startJob(SCAFFOLD_STEPS, () => {
          mockDb.saveImplementationSetup({
            ...mockDb.getImplementationSetup(projectId),
            scaffoldStatus: 'ready',
            scaffoldBranch: 'develop',
            scaffoldedAt: nowIso(),
          })
          appendDevMemory(projectId, [
            {
              kind: 'migration',
              scope: 'fullstack',
              title: 'Initial project scaffold',
              content:
                'Scaffolded the base project (app shell, routing, data layer, CI) and pushed it to develop.',
              story: null,
              relatedSlugs: [],
            },
          ])
          return { branch: 'develop', build: passingBuild() }
        }),
      )
    },
  },
  {
    method: 'GET',
    pattern: 'projects/:projectId/scaffold/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown scaffold job.')
    },
  },
]
