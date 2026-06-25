// Per-phase working state for a strategy project. Mock-persisted (localStorage);
// no real files/AI — upload/generate are state transitions, like the artifact mock.

/**
 * A phase's manual lifecycle status. The user moves it by hand; `done` freezes the
 * phase (read-only) — to edit inputs or regenerate, move it back to `in-progress`.
 */
export type PhaseStatus = 'new' | 'in-progress' | 'done'

/** An uploaded file against a mandatory input slot (the real document name + size + when). */
export interface UploadedFile {
  id: string
  name: string
  /** File size in bytes (from the picked File; shown as metadata). */
  size?: number
  /** ISO timestamp the file was uploaded (shown as metadata). */
  uploadedAt: string
}

/** A user-added free-form input document (the optional/"Additional" section). */
export interface AdditionalDoc {
  id: string
  name: string
  /** File size in bytes (from the picked File; shown as metadata). */
  size?: number
  /** Free-text context/prompt shown beneath the document; '' when none. */
  context: string
  /** ISO timestamp the document was uploaded (shown as metadata). */
  uploadedAt?: string
  /** KC object-store blob name — present when the file was successfully stored; used to download. */
  objectBlobName?: string
}

/** A gap/ambiguity the AI flagged while generating an output, for the user to resolve. */
export interface OpenQuestion {
  id: string
  question: string
  /** What surfaced it — typically the output document generation that flagged it. */
  source: string
  resolved: boolean
}

/** A user-authored note/todo at phase level (internal reference); markable resolved. */
export interface PhaseComment {
  id: string
  text: string
  resolved: boolean
  /** ISO timestamp the comment was added (shown as metadata). */
  createdAt: string
}

/** Progress for one configured phase. */
export interface PhaseProgress {
  /** Mandatory input slot title → the actual files uploaded against it. */
  mandatoryFiles: Record<string, UploadedFile[]>
  /** Names of output documents marked generated. */
  generatedOutputs: string[]
  /** Output name → ISO timestamp it was last generated (shown as metadata). */
  generatedAt: Record<string, string>
  /** Per-mandatory-slot context/prompt (slot title → free text) that guides generation. */
  inputContext: Record<string, string>
  /** Free-form additional documents the user uploaded (not predefined inputs). */
  additionalDocs: AdditionalDoc[]
  /** AI-flagged open questions for this phase. */
  openQuestions: OpenQuestion[]
  /** User-authored comments/notes for this phase (productivity; resolvable). */
  comments: PhaseComment[]
  /** Manual lifecycle status; `done` (the value) locks every transactional action. */
  status: PhaseStatus
  /** Legacy/back-compat: the backend's `done` flag — `normalizeProgress` migrates it into `status`. */
  done?: boolean
  /** The backend phase-machine state (Blocked | AwaitingInputs | ReadyToGenerate | Completed). Live-backend only. */
  state?: string
  /** The actions the backend permits next for this phase (live-backend gating hint; no client-side gating). */
  permittedActions?: string[]
}

/** The project's roll-up lifecycle status (chosen strategy + sign-off readiness + progress). */
export interface ProjectStatus {
  state: string
  canSignOff: boolean
  phases: number
  completedPhases: number
  /** The chosen strategy template key (null/undefined for a custom build). */
  strategyKey?: string
  /** The chosen strategy's display name (e.g. "Tech Migration Strategy"); "Custom strategy" for a custom build. */
  strategyName?: string
}

/** All phases' progress for a project, keyed by phase id. */
export type PhaseStateMap = Record<string, PhaseProgress>

/** One generated KB note shown in the Discovery KB viewer (ADR-0074). */
export interface StrategyKbNote {
  id: string
  title: string
  description: string
  content: string
  sourceFile?: string
}

/** One KB section (a discovery category) with its notes — empty `notes` = not covered yet. */
export interface StrategyKbSection {
  id: string
  label: string
  description: string
  notes: StrategyKbNote[]
}

/** The project's assembled discovery knowledge base. `lastGeneratedAt` is null until generated. */
export interface StrategyKb {
  sections: StrategyKbSection[]
  lastGeneratedAt: string | null
}

/**
 * One instantiated phase as the strategy module returns it — the frozen config (name/inputs/outputs/DAG) plus its
 * live progress. The module owns the project's phases (in the strategy capability schema, never in Core), so the
 * workspace builds both its rail and its PhaseStateMap from the ordered list of these.
 */
export interface StrategyPhaseView {
  id: string
  name: string
  description: string
  mandatory: boolean
  ordinal: number
  dependsOn: string[]
  inputs: { name: string; mandatory: boolean }[]
  outputs: { name: string; fmt: string }[]
  progress: PhaseProgress
}

/** The actions the PATCH endpoint applies to a phase's progress. */
export type PhaseStateAction =
  | 'upload'
  | 'delete-mandatory-file'
  | 'generate'
  | 'context'
  | 'set-status'
  | 'upload-additional'
  | 'delete-additional'
  | 'additional-context'
  | 'resolve-question'
  | 'reopen-question'
  | 'add-comment'
  | 'resolve-comment'
  | 'reopen-comment'
  | 'delete-comment'

/** Body for PATCH /projects/:id/phase-state. */
export interface UpdatePhaseStateInput {
  projectId: string
  phaseId: string
  action: PhaseStateAction
  /** Mandatory slot title (upload / delete-mandatory-file / context), output name (generate),
   *  or new additional-doc name (upload-additional). */
  name?: string
  /** The uploaded file's real name (upload — added against the mandatory slot in `name`). */
  fileName?: string
  /** The uploaded file's size in bytes (upload / upload-additional). */
  fileSize?: number
  /** Free text — context/prompt (context / additional-context; blank clears) or a new
   *  comment body (add-comment). */
  text?: string
  /** Target lifecycle status (set-status). */
  status?: PhaseStatus
  /** Target id — a mandatory file (delete-mandatory-file), an additional doc
   *  (delete-additional / additional-context), an open question (resolve / reopen), or a
   *  comment (resolve / reopen / delete-comment). */
  id?: string
}

/** Standard API envelope — payload wrapped in `result`. */
export interface ApiEnvelope<T> {
  result: T
  errors?: unknown
}
