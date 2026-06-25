import type { Story, TestCase } from '../models/model'
import type { GeneratedCode } from '../../../../types'
import { criterionText } from '../../../../utility/story'

/** A test case before the store stamps its id + createdAt. */
export type TestCaseDraft = Omit<TestCase, 'id' | 'createdAt'>

const personaOf = (story: Story): string => story.asA?.trim() || 'user'
const goalOf = (story: Story): string => story.iWant?.trim() || story.title

/**
 * Derives unit-test cases from the unit-test stub generated during the
 * Implementation phase (`makeTestFile` in implementation/.../mockCode.ts emits
 * one `it('<criterion>')` per acceptance criterion). Surfacing these here means
 * the stubs appear in Test without regeneration (requirements §9.1). Returns an
 * empty list when no code was generated for the story.
 */
export function stubsFromCode(story: Story, code: GeneratedCode | null): TestCaseDraft[] {
  if (!code) return []
  const testFile = code.files.find((f) => f.filename.endsWith('.test.tsx') || f.filename.endsWith('.test.ts'))
  if (!testFile) return []

  // Pull each `it('<criterion>', …)` title out of the generated stub.
  const criteria = [...testFile.content.matchAll(/it\('(.+?)',/g)].map((m) =>
    m[1].replace(/\\'/g, "'"),
  )
  if (criteria.length === 0) return []

  return criteria.map((criterion) => ({
    storyId: story.id,
    title: criterion,
    type: 'unit',
    steps: [
      `Run the unit test suite for ${story.id}.`,
      `Exercise the code generated for "${story.title}".`,
    ],
    expectedResult: `The assertion for "${criterion}" passes.`,
    status: 'pending',
    fromImplementation: true,
  }))
}

/**
 * Mock AI test generation for a story: a happy path plus basic negative / edge
 * cases (requirements §9.1), wired to the story's persona, goal, and acceptance
 * criteria. Optional `context` adds a targeted scenario the user asked for.
 * Returns drafts; the service assigns ids and persists them.
 */
export function generateMockTests(story: Story, context?: string): TestCaseDraft[] {
  const persona = personaOf(story)
  const goal = goalOf(story)
  const firstCriterion = story.acceptanceCriteria[0] ? criterionText(story.acceptanceCriteria[0]) : undefined

  const drafts: TestCaseDraft[] = [
    {
      storyId: story.id,
      title: `Happy path: ${persona} can ${goal}`,
      type: 'e2e',
      steps: [
        `Sign in as a ${persona}.`,
        `Navigate to the "${story.title}" flow.`,
        'Complete the primary action with valid inputs.',
      ],
      expectedResult: firstCriterion
        ? `The action succeeds and "${firstCriterion}" holds.`
        : 'The action completes successfully and a confirmation is shown.',
      status: 'pending',
      fromImplementation: false,
    },
    {
      storyId: story.id,
      title: 'Rejects invalid input',
      type: 'edge',
      steps: [
        `Open the "${story.title}" flow as a ${persona}.`,
        'Submit the form with missing or malformed required fields.',
      ],
      expectedResult: 'Submission is blocked and a clear, field-level validation message is shown.',
      status: 'pending',
      fromImplementation: false,
    },
    {
      storyId: story.id,
      title: 'Handles a backend failure gracefully',
      type: 'integration',
      steps: [
        `Trigger the "${story.title}" action as a ${persona}.`,
        'Simulate the API returning a 500 error.',
      ],
      expectedResult: 'A human-readable error is surfaced and the user can retry — no data is lost.',
      status: 'pending',
      fromImplementation: false,
    },
  ]

  const note = context?.trim()
  if (note) {
    drafts.push({
      storyId: story.id,
      title: `Scenario: ${note}`,
      type: 'edge',
      steps: [
        `Set up the conditions described: ${note}.`,
        `Exercise the "${story.title}" flow under those conditions.`,
      ],
      expectedResult: 'The system behaves correctly for the requested scenario.',
      status: 'pending',
      fromImplementation: false,
    })
  }

  return drafts
}
