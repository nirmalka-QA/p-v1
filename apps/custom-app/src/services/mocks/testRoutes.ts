import type { MockRoute } from '@wispr/services'
import { mockDb } from '../mockDb'
import { nextTestId } from '../../features/test/utility/helpers/helpers'
import {
  generateMockTests,
  stubsFromCode,
  type TestCaseDraft,
} from '../../features/test/utility/helpers/mockTests'
import type { TestCase, TestStatus, GeneratedCode } from '../../types'
import { startJob, pollJob } from './jobs'
import { ok, fail, nowIso } from './shared'

/**
 * Test-phase mock routes. Ports the pre-live behaviour (seeded unit-test stubs
 * from implemented stories, AI generation per story, manual pass/fail) onto the
 * live URL contract, including the progressive generation job.
 */

const TEST_STEPS = [
  { key: 'context', label: 'Reading the story & acceptance criteria' },
  { key: 'happy', label: 'Writing happy-path cases' },
  { key: 'negative', label: 'Writing negative & edge cases' },
  { key: 'finalise', label: 'Finalising test cases' },
]

/** Stamps a draft with a sequential id + timestamp, mutating the running list. */
function commit(accumulating: TestCase[], draft: TestCaseDraft): TestCase {
  const testCase: TestCase = { ...draft, id: nextTestId(accumulating), createdAt: nowIso() }
  accumulating.push(testCase)
  return testCase
}

/** Generated code may exist under any scope — stubs read whichever is present. */
function anyCode(projectId: string, storyId: string): GeneratedCode | null {
  for (const scopeName of ['fullstack', 'frontend', 'backend']) {
    const code = mockDb.getCode(`${projectId}/${scopeName}/${storyId}`)
    if (code) return { ...code, storyId }
  }
  return null
}

/**
 * Seeds unit-test stubs for every implemented story that doesn't have them yet,
 * then returns the merged list (persisting keeps stub status toggles sticky).
 */
function withSeededStubs(projectId: string): TestCase[] {
  const stored = mockDb.getTestCases(projectId)
  const implemented = mockDb.getStories(projectId).filter((s) => !s.archived && s.status === 'done')
  const haveStubs = new Set(stored.filter((t) => t.fromImplementation).map((t) => t.storyId))

  const accumulating = [...stored]
  let added = false
  for (const story of implemented) {
    if (haveStubs.has(story.id)) continue
    const stubs = stubsFromCode(story, anyCode(projectId, story.id))
    if (stubs.length === 0) continue
    stubs.forEach((draft) => commit(accumulating, draft))
    added = true
  }
  return added ? mockDb.saveTestCases(projectId, accumulating) : stored
}

function generateFor(projectId: string, storyId: string, context?: string): TestCase[] {
  const story = mockDb.getStories(projectId).find((s) => s.id === storyId)
  if (!story) throw new Error('Story not found.')
  const accumulating = [...mockDb.getTestCases(projectId)]
  generateMockTests(story, context).forEach((draft) => commit(accumulating, draft))
  return mockDb.saveTestCases(projectId, accumulating)
}

export const testRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'projects/:projectId/tests',
    handler: ({ params }) => ok(withSeededStubs(params['projectId'] ?? '')),
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storySlug/generate-tests',
    handler: ({ params, body }) => {
      const { context } = (body ?? {}) as { context?: string }
      try {
        return ok(generateFor(params['projectId'] ?? '', params['storySlug'] ?? '', context))
      } catch (error) {
        return fail(404, error instanceof Error ? error.message : 'Story not found.')
      }
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storySlug/generate-tests/start',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const storySlug = params['storySlug'] ?? ''
      const { context } = (body ?? {}) as { context?: string }
      if (!mockDb.getStories(projectId).some((s) => s.id === storySlug)) {
        return fail(404, 'Story not found.')
      }
      return ok(
        startJob(TEST_STEPS, () => ({ testCases: generateFor(projectId, storySlug, context) })),
      )
    },
  },

  {
    method: 'GET',
    pattern: 'projects/:projectId/generate-tests/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },

  {
    method: 'POST',
    pattern: 'projects/:projectId/stories/:storySlug/tests',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const values = (body ?? {}) as Omit<TestCaseDraft, 'storyId' | 'fromImplementation'>
      const accumulating = [...mockDb.getTestCases(projectId)]
      commit(accumulating, {
        ...values,
        storyId: params['storySlug'] ?? '',
        fromImplementation: false,
      })
      return ok(mockDb.saveTestCases(projectId, accumulating))
    },
  },

  // PATCH carries either a full edit (form values) or just `{ status }`.
  {
    method: 'PATCH',
    pattern: 'projects/:projectId/tests/:testSlug',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const testSlug = params['testSlug'] ?? ''
      const existing = mockDb.getTestCases(projectId)
      if (!existing.some((t) => t.id === testSlug)) return fail(404, 'Test case not found.')

      const patch = (body ?? {}) as Partial<TestCase> & { status?: TestStatus }
      const updated = existing.map((t) => {
        if (t.id !== testSlug) return t
        if (patch.status && patch.title === undefined) return { ...t, status: patch.status }
        return { ...t, ...patch }
      })
      return ok(mockDb.saveTestCases(projectId, updated))
    },
  },

  {
    method: 'DELETE',
    pattern: 'projects/:projectId/tests/:testSlug',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      const updated = mockDb.getTestCases(projectId).filter((t) => t.id !== params['testSlug'])
      return ok(mockDb.saveTestCases(projectId, updated))
    },
  },
]
