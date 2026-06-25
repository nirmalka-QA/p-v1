import { mockDb } from '../mockDb'
import { generateMockKB } from '../../features/discovery/utility/helpers/mockKb'
import { generateMockPlan } from '../../features/planning/utility/helpers/mockPlanning'
import {
  generateMockStories,
  computeImpact,
} from '../../features/features/utility/helpers/mockStories'
import { nextStoryId } from '../../features/features/utility/helpers/helpers'
import { buildSuggestedStack } from '../../features/implementation/utility/helpers/mockTechStack'
import { generateMockCode } from '../../features/implementation/utility/helpers/mockCode'
import { buildRepoConnection } from '../../features/implementation/utility/helpers/mockRepo'
import type { Story, StoryStatus } from '../../types'
import { syncFeatureCounts } from './featuresRoutes'
import { extraState, persistExtra } from './extraState'
import { nextId } from './shared'

/**
 * Seeds one demo project (the first seeded project, id 101) mid-flight so every
 * phase shows realistic content out of the box: generated KB, an approved plan,
 * stories across the workflow states, a locked tech stack, a connected repo with
 * a completed scaffold, and generated code for the implemented story. The other
 * seed projects stay empty so the generation flows can be exercised live.
 * Runs once — guarded by the presence of the project's KB.
 */

const DEMO_PROJECT_ID = '101'

/** The workflow spread applied to the first generated stories. */
const STORY_STATUSES: StoryStatus[] = ['done', 'in-progress', 'ready', 'ready']

export function seedDemoProject(): void {
  if (mockDb.getKb(DEMO_PROJECT_ID)) return

  const now = new Date().toISOString()

  // Discovery: a generated Knowledge Base.
  const kb = generateMockKB(DEMO_PROJECT_ID, 3)
  mockDb.saveKb({ ...kb, generation: 1, impact: null })

  // Planning: a generated plan with every feature approved.
  const plan = generateMockPlan(DEMO_PROJECT_ID, kb)
  const approved = {
    ...plan,
    features: plan.features.map((f) => ({ ...f, status: 'approved' as const })),
  }
  mockDb.savePlan(approved)

  // Features: stories for the first two features, spread across the workflow.
  const targets = approved.features.slice(0, 2)
  const accumulating: Story[] = []
  for (const feature of targets) {
    for (const draft of generateMockStories(feature)) {
      const id = nextStoryId(accumulating)
      const story: Story = { ...draft, id, projectId: DEMO_PROJECT_ID, createdAt: now }
      const impact = computeImpact(story, accumulating)
      accumulating.push({ ...story, ...impact })
    }
  }
  const stories = accumulating.map((s, index) => ({
    ...s,
    status: STORY_STATUSES[index] ?? s.status,
  }))
  mockDb.saveStories(DEMO_PROJECT_ID, stories)
  syncFeatureCounts(DEMO_PROJECT_ID)

  // Implementation: suggested stack, connected repo, completed scaffold.
  mockDb.saveTechStack({ projectId: DEMO_PROJECT_ID, items: buildSuggestedStack('healthcare') })
  mockDb.saveRepo(buildRepoConnection(DEMO_PROJECT_ID, 'Aurora Patient Portal', now))
  mockDb.saveImplementationSetup({
    projectId: DEMO_PROJECT_ID,
    wizardDismissed: true,
    scaffoldStatus: 'ready',
    scaffoldBranch: 'develop',
    scaffoldedAt: now,
  })

  // Generated code for the implemented story (Test-phase stubs derive from it).
  const implemented = stories.find((s) => s.status === 'done')
  if (implemented) {
    const stack = mockDb.getTechStack(DEMO_PROJECT_ID)?.items ?? []
    const code = generateMockCode(implemented, stack, now)
    mockDb.saveCode({ ...code, storyId: `${DEMO_PROJECT_ID}/fullstack/${implemented.id}` })

    extraState.devMemory[DEMO_PROJECT_ID] = [
      {
        id: nextId('mem'),
        kind: 'commit',
        scope: 'fullstack',
        title: `Pushed feature/${implemented.id.toLowerCase()}-fullstack`,
        content: `Generated ${code.files.length} file(s) for “${implemented.title}” and pushed the branch. Build and tests passed.`,
        story: implemented.id,
        relatedSlugs: [],
        createdAt: now,
      },
      {
        id: nextId('mem'),
        kind: 'migration',
        scope: 'fullstack',
        title: 'Initial project scaffold',
        content:
          'Scaffolded the base project (app shell, routing, data layer, CI) and pushed it to develop.',
        story: null,
        relatedSlugs: [],
        createdAt: now,
      },
    ]
    persistExtra()
  }
}
