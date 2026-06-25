import type { Feature, Story, GherkinCriterion } from '../../../../types'
import { criterionText, gherkin } from '../../../../utility/story'

/**
 * Mock AI story generation + impact analysis. Until the generate-stories /
 * impact-check endpoints are live, this slices a feature into realistic user
 * stories and flags potential impact on closed stories. Swap the featuresApi
 * `queryFn`s for `query` to go live.
 */

/** A generated story before project-level fields (id / projectId / createdAt) are assigned. */
export type StoryDraft = Omit<Story, 'id' | 'projectId' | 'createdAt'>

/** First word of the feature title, lowercased — used as a coarse impact tag. */
function featureTag(feature: Feature): string {
  return feature.title.toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, '') || 'feature'
}

/**
 * Produces three complementary stories for a feature: the core capability, a
 * management/edit flow, and validation/error handling. Content is templated from
 * the feature so it reads as domain-appropriate without a real model.
 */
export function generateMockStories(feature: Feature): StoryDraft[] {
  const tag = featureTag(feature)
  const subject = feature.title.replace(/\s*\(.*\)\s*/g, '').trim()
  const base = { featureId: feature.id, dependencies: [], impactedStories: [], impactDismissed: false }

  return [
    {
      ...base,
      title: `${subject} — core flow`,
      description: `Covers the primary end-to-end path for ${subject.toLowerCase()}: how the user initiates the action, the expected result, and the feedback shown on success. This is the backbone story for the feature — other stories build on it.`,
      asA: 'user',
      iWant: `to use ${subject.toLowerCase()} from the main interface`,
      soThat: 'I can accomplish the primary task this feature exists for',
      acceptanceCriteria: [
        gherkin('The primary action is reachable from the relevant screen without extra navigation.'),
        gherkin('A successful action shows clear confirmation feedback.'),
        gherkin('Loading, empty, and error states are all handled.'),
      ],
      effort: 5,
      status: 'draft',
      assignee: undefined,
      tags: [tag, 'mvp'],
    },
    {
      ...base,
      title: `${subject} — manage & edit`,
      description: `Lets the user revisit and amend existing ${subject.toLowerCase()} data after it was first created, with optimistic updates and a safe rollback if a save fails. Keeps records accurate without re-entering everything.`,
      asA: 'user',
      iWant: `to review and update existing ${subject.toLowerCase()} entries`,
      soThat: 'I can keep the information accurate over time',
      acceptanceCriteria: [
        gherkin('Existing entries are listed with their key attributes.'),
        gherkin('Editing applies optimistically and rolls back on failure.'),
        gherkin('Changes are reflected immediately in the relevant views.'),
      ],
      effort: 3,
      status: 'draft',
      assignee: undefined,
      tags: [tag, 'crud'],
    },
    {
      ...base,
      title: `${subject} — validation & error handling`,
      description: `Defines how ${subject.toLowerCase()} behaves on bad input and failure: inline validation messages, graceful recovery from server/network errors, and no silent dead-ends. Protects data integrity and user trust.`,
      asA: 'user',
      iWant: 'to receive clear, actionable feedback when something goes wrong',
      soThat: 'I understand what to fix and can recover without losing work',
      acceptanceCriteria: [
        gherkin('Invalid input is caught with inline, human-readable messages.'),
        gherkin('Server/network failures surface a retry path rather than a dead end.'),
      ],
      effort: 2,
      status: 'draft',
      assignee: undefined,
      tags: [tag, 'validation'],
    },
  ]
}

export interface ImpactResult {
  impactedStories: string[]
  impactSummary?: string
}

/**
 * Checks whether `story` may impact existing CLOSED stories in the project. A
 * closed story is considered impacted when it shares a tag with, or belongs to
 * the same feature as, the new story (requirements §7.4). Returns the impacted
 * ids plus a human-readable summary report.
 */
export function computeImpact(
  story: Pick<Story, 'id' | 'featureId' | 'tags'>,
  allStories: Story[]
): ImpactResult {
  const tags = new Set(story.tags)
  const impacted = allStories.filter(
    (s) =>
      s.id !== story.id &&
      s.status === 'closed' &&
      (s.featureId === story.featureId || s.tags.some((t) => tags.has(t)))
  )

  if (impacted.length === 0) return { impactedStories: [] }

  const lines = impacted
    .map((s) => `- **${s.id} ${s.title}** — overlaps on ${
      s.featureId === story.featureId ? 'the same feature' : 'shared scope'
    }; re-verify its acceptance criteria still hold.`)
    .join('\n')

  return {
    impactedStories: impacted.map((s) => s.id),
    impactSummary: `This story may affect ${impacted.length} closed ${
      impacted.length === 1 ? 'story' : 'stories'
    }. Review before development:\n\n${lines}\n\nClosing this story or merging its changes could require reopening the affected work.`,
  }
}

/**
 * Mock AI "enhance" for a single story: enriches the description and appends
 * acceptance criteria, optionally steered by free-text `instructions`. Existing
 * content is preserved (never overwritten) and additions are de-duplicated so
 * repeated enhancement converges instead of growing without bound.
 */
export function enhanceStoryContent(
  story: Pick<Story, 'title' | 'description' | 'asA' | 'iWant' | 'soThat' | 'acceptanceCriteria'>,
  instructions?: string
): { description: string; acceptanceCriteria: GherkinCriterion[] } {
  const focus = instructions?.trim()

  const baseParagraph =
    story.description.trim() ||
    `As a ${story.asA}, the user wants ${story.iWant}, so that ${story.soThat}. This story covers the end-to-end flow for “${story.title}”, including the happy path and the most likely failure paths.`

  const addParagraph = focus
    ? `AI focus — ${focus}: the implementation should explicitly address this, with matching acceptance criteria and tests.`
    : `Non-functionals: handle loading / empty / error states, meet WCAG 2.1 AA, and keep every interaction keyboard-operable.`

  const paragraphs = baseParagraph.split('\n\n')
  if (!paragraphs.includes(addParagraph)) paragraphs.push(addParagraph)
  const description = paragraphs.join('\n\n')

  const extraCriteria = focus
    ? [`Explicitly satisfies the requested focus: ${focus}.`, 'Includes a negative-path test covering that focus.']
    : [
        'Behaviour is verified on both the happy path and a representative failure path.',
        'Meets WCAG 2.1 AA and is fully keyboard-operable.',
      ]
  const existingTexts = new Set(story.acceptanceCriteria.map(criterionText))
  const acceptanceCriteria: GherkinCriterion[] = [
    ...story.acceptanceCriteria,
    ...extraCriteria.filter((c) => !existingTexts.has(c)).map(gherkin),
  ]

  return { description, acceptanceCriteria }
}
