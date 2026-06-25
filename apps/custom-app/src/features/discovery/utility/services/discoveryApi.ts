import type { AxiosError } from 'axios'
import { baseApi } from '../../../../services/baseApi'
import { apiClient } from '../../../../services/apiClient'
import { API_ENDPOINTS, API_TAGS, LIST_ID } from '@wispr/contracts'
import { mockDb, delay } from '../../../../services/mockDb'
import { findNote, applyNoteUpdate, enhanceNoteContent } from '../helpers/mockKb'
import { runImpact } from '../../../impact/utility/helpers/runImpact'
import type { KnowledgeBase, UploadedFile, NoteFormValues, KbGenerationStatus } from '../models/model'

/**
 * Standard backend envelope (ResponseDto<T>): every body is `{ success, data, ... }`.
 * Endpoints unwrap `.data` at the boundary so components see plain domain types.
 */
interface ResponseEnvelope<T> {
  success: boolean
  data: T | null
  message?: string | null
}

// A KB change invalidates the KB plus the cross-phase impact + audit caches.
const kbTags = (projectId: string) => [
  { type: API_TAGS.KnowledgeBase, id: projectId },
  { type: API_TAGS.Impact, id: LIST_ID },
  { type: API_TAGS.Audit, id: LIST_ID },
]

/**
 * Discovery endpoints — live against the backend via axiosBaseQuery. The KB and
 * uploads share the project's `/api` base. `getKb` returns null until the KB has
 * been generated (so the first-time build form still shows); `addUploads` streams
 * each File as multipart to the upload endpoint. Manual note edit/enhance remain
 * mock-backed and drive the cross-phase impact engine via `runImpact` + `kbTags`.
 */
export const discoveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKb: build.query<KnowledgeBase | null, string>({
      query: (projectId) => ({ url: API_ENDPOINTS.kb(projectId), method: 'GET' }),
      // A never-generated KB (no lastGeneratedAt) is treated as "no KB yet".
      transformResponse: (res: ResponseEnvelope<KnowledgeBase>) => {
        const kb = res?.data ?? null
        return kb && kb.lastGeneratedAt ? kb : null
      },
      providesTags: (_result, _error, projectId) => [
        { type: API_TAGS.KnowledgeBase, id: projectId },
      ],
    }),

    // Progressive generation: start a job, then poll getKbGenerationStatus until completed.
    startGenerateKb: build.mutation<KbGenerationStatus, { projectId: string; context: string }>({
      query: ({ projectId, context }) => ({
        url: API_ENDPOINTS.generateKbStart(projectId),
        method: 'POST',
        data: { context },
      }),
      transformResponse: (res: ResponseEnvelope<KbGenerationStatus>) => res.data as KbGenerationStatus,
      // KB regeneration invalidates everything derived from it (impact + audit caches).
      invalidatesTags: (_result, _error, { projectId }) => kbTags(projectId),
    }),

    getKbGenerationStatus: build.query<KbGenerationStatus, { projectId: string; jobId: string }>({
      query: ({ projectId, jobId }) => ({
        url: API_ENDPOINTS.kbStatus(projectId, jobId),
        method: 'GET',
      }),
      transformResponse: (res: ResponseEnvelope<KbGenerationStatus>) => res.data as KbGenerationStatus,
    }),

    getUploads: build.query<UploadedFile[], string>({
      query: (projectId) => ({ url: API_ENDPOINTS.uploads(projectId), method: 'GET' }),
      transformResponse: (res: ResponseEnvelope<UploadedFile[]>) => res.data ?? [],
      providesTags: (_result, _error, projectId) => [{ type: API_TAGS.Upload, id: projectId }],
    }),

    addUploads: build.mutation<UploadedFile[], { projectId: string; files: File[] }>({
      // The backend accepts one multipart file per request; upload each in turn.
      async queryFn({ projectId, files }) {
        try {
          const created: UploadedFile[] = []
          for (const file of files) {
            const form = new FormData()
            form.append('file', file)
            const res = await apiClient.post(API_ENDPOINTS.uploads(projectId), form)
            const dto = (res.data?.data ?? res.data) as UploadedFile
            created.push(dto)
          }
          return { data: created }
        } catch (axiosError) {
          const err = axiosError as AxiosError
          return {
            error: { status: err.response?.status, data: err.response?.data ?? err.message },
          }
        }
      },
      invalidatesTags: (_result, _error, { projectId }) => [{ type: API_TAGS.Upload, id: projectId }],
    }),

    // Manual edit of a KB note (title / description / Markdown content).
    updateNote: build.mutation<
      KnowledgeBase,
      { projectId: string; noteId: string; values: NoteFormValues }
    >({
      async queryFn({ projectId, noteId, values }) {
        const kb = mockDb.getKb(projectId)
        if (!kb) return { error: { status: 404, data: 'No Knowledge Base to update.' } }
        const old = findNote(kb, noteId)
        if (!old) return { error: { status: 404, data: 'Note not found.' } }
        await delay(150)

        const patch = {
          title: values.title.trim(),
          description: values.description.trim(),
          content: values.content.trim(),
        }
        // Only a material change bumps the revision and propagates impact —
        // re-saving identical content must not raise spurious alerts.
        const changed =
          patch.title !== old.title || patch.description !== old.description || patch.content !== old.content
        const revision = changed ? (old.revision ?? 1) + 1 : old.revision ?? 1

        const next = applyNoteUpdate(kb, noteId, { ...patch, revision })
        mockDb.saveKb(next)

        if (changed) {
          runImpact({
            projectId,
            now: new Date().toISOString(),
            change: {
              source: {
                phase: 'discovery',
                kind: 'kb-note',
                refId: noteId,
                label: patch.title || old.title,
                changeType: 'edited',
              },
              sourceRevision: revision,
              kbSectionId: old.sectionId,
            },
            auditType: 'note-edited',
            auditSummary: `Edited KB note “${patch.title || old.title}”.`,
          })
        }
        return { data: next }
      },
      invalidatesTags: (_result, _error, { projectId }) => kbTags(projectId),
    }),

    // AI-enhance a KB note: elaborate its Markdown content.
    enhanceNote: build.mutation<
      KnowledgeBase,
      { projectId: string; noteId: string; instructions?: string }
    >({
      async queryFn({ projectId, noteId, instructions }) {
        const kb = mockDb.getKb(projectId)
        const note = kb ? findNote(kb, noteId) : undefined
        if (!kb || !note) return { error: { status: 404, data: 'Note not found.' } }
        await delay(600)

        const enhanced = enhanceNoteContent(note, instructions)
        const changed = enhanced.content !== note.content
        const revision = changed ? (note.revision ?? 1) + 1 : note.revision ?? 1

        const next = applyNoteUpdate(kb, noteId, { ...enhanced, revision })
        mockDb.saveKb(next)

        if (changed) {
          runImpact({
            projectId,
            now: new Date().toISOString(),
            change: {
              source: {
                phase: 'discovery',
                kind: 'kb-note',
                refId: noteId,
                label: note.title,
                changeType: 'enhanced',
              },
              sourceRevision: revision,
              kbSectionId: note.sectionId,
            },
            auditType: 'note-enhanced',
            auditSummary: `Enhanced KB note “${note.title}” with AI.`,
          })
        }
        return { data: next }
      },
      invalidatesTags: (_result, _error, { projectId }) => kbTags(projectId),
    }),
  }),
})

export const {
  useGetKbQuery,
  useStartGenerateKbMutation,
  useLazyGetKbGenerationStatusQuery,
  useGetUploadsQuery,
  useAddUploadsMutation,
  useUpdateNoteMutation,
  useEnhanceNoteMutation,
} = discoveryApi
