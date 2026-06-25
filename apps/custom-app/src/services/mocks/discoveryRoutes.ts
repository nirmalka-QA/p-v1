import type { MockRoute } from '@wispr/services'
import { mockDb } from '../mockDb'
import { generateMockKB } from '../../features/discovery/utility/helpers/mockKb'
import type { KnowledgeBase, UploadedFile } from '../../types'
import { startJob, pollJob } from './jobs'
import { ok, fail, nextId, nowIso } from './shared'

/**
 * Discovery mock routes — Knowledge Base + uploads. Generation follows the
 * progressive start/poll contract; the produced KB persists through mockDb so
 * the phase gates (Planning unlock) work exactly like the live backend.
 */

const KB_STEPS = [
  { key: 'read', label: 'Reading project context & uploaded files' },
  { key: 'extract', label: 'Extracting requirements and constraints' },
  { key: 'draft', label: 'Drafting Knowledge Base sections' },
  { key: 'link', label: 'Cross-linking notes and sources' },
  { key: 'finalise', label: 'Finalising the Knowledge Base' },
]

/** Builds (or regenerates) the KB; regeneration bumps the generation counter. */
function buildKb(projectId: string): KnowledgeBase {
  const existing = mockDb.getKb(projectId)
  const sourceFiles = mockDb.listUploads(projectId).length
  const fresh = generateMockKB(projectId, Math.max(1, sourceFiles))

  if (!existing) return mockDb.saveKb({ ...fresh, generation: 1, impact: null })

  const generation = (existing.generation ?? 1) + 1
  return mockDb.saveKb({
    ...fresh,
    generation,
    impact: {
      generation,
      summary:
        'Re-generated from the latest context. Section drafts were refreshed; manually edited notes were preserved where their sources were unchanged.',
      gaps: 'Integration constraints and non-functional targets would benefit from more source material.',
      createdAt: nowIso(),
    },
  })
}

export const discoveryRoutes: MockRoute[] = [
  {
    method: 'GET',
    pattern: 'requirements/projects/:projectId/kb',
    handler: ({ params }) => ok(mockDb.getKb(params['projectId'] ?? '')),
  },

  {
    method: 'POST',
    pattern: 'requirements/projects/:projectId/generate-kb/start',
    handler: ({ params }) => {
      const projectId = params['projectId'] ?? ''
      return ok(startJob(KB_STEPS, () => ({ knowledgeBase: buildKb(projectId) })))
    },
  },

  {
    method: 'GET',
    pattern: 'requirements/projects/:projectId/generate-kb/status/:jobId',
    handler: ({ params }) => {
      const status = pollJob(params['jobId'] ?? '')
      return status ? ok(status) : fail(404, 'Unknown generation job.')
    },
  },

  // Legacy synchronous generation — kept for completeness.
  {
    method: 'POST',
    pattern: 'requirements/projects/:projectId/generate-kb',
    handler: ({ params }) => ok(buildKb(params['projectId'] ?? '')),
  },

  {
    method: 'GET',
    pattern: 'requirements/projects/:projectId/uploads',
    handler: ({ params }) => ok(mockDb.listUploads(params['projectId'] ?? '')),
  },

  // One multipart file per request (mirrors the backend contract).
  {
    method: 'POST',
    pattern: 'requirements/projects/:projectId/uploads',
    handler: ({ params, body }) => {
      const projectId = params['projectId'] ?? ''
      const file = body instanceof FormData ? body.get('file') : null
      if (!(file instanceof File)) return fail(400, 'No file in the upload request.')

      const dto: UploadedFile = {
        id: nextId('file'),
        name: file.name,
        type: file.type || file.name.split('.').pop() || 'file',
        size: file.size,
        status: 'ready',
        uploadedAt: nowIso(),
      }
      mockDb.addUploads(projectId, [dto])
      return ok(dto)
    },
  },

  {
    method: 'DELETE',
    pattern: 'requirements/projects/:projectId/uploads/:fileId',
    handler: ({ params }) =>
      ok(mockDb.removeUpload(params['projectId'] ?? '', params['fileId'] ?? '')),
  },
]
