/**
 * Async-operation wire types (Phase 10 / ADR-0072) — the shape the KC operations edge returns and the
 * `useOperation` hook + `<OperationProgress>` component consume. camelCase, matching the backend OperationDto.
 */

export type OperationStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled'

export interface OperationDelivery {
  /** How to observe the operation — backend-preconfigured. `poll` (default) or `sse`. */
  mode: 'poll' | 'sse'
  pollIntervalMs?: number | null
}

export interface OperationStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
}

export interface OperationSkillRef {
  skillId: string
  integration?: string | null
  target: string
}

export interface OperationProgressEvent {
  seq: number
  at: string
  kind: 'status' | 'activity' | 'step' | 'log'
  status?: OperationStatus | null
  activity?: string | null
  skill?: OperationSkillRef | null
  step?: OperationStep | null
  percent?: number | null
  level: 'info' | 'warn'
}

export interface OperationFailure {
  code: string
  message: string
  transient: boolean
}

/** A durable async-operation snapshot — status, the live "what it's doing" activity, steps, percent, result/failure. */
export interface SkillOperation {
  operationId: string
  kind: string
  status: OperationStatus
  percent?: number | null
  activity?: string | null
  delivery: OperationDelivery
  steps: OperationStep[]
  events: OperationProgressEvent[]
  result?: unknown
  failure?: OperationFailure | null
  lastSeq: number
  createdAt: string
  updatedAt: string
}

/** True once the operation has reached a terminal state (no more polling/streaming needed). */
export function isOperationTerminal(status: OperationStatus | undefined): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'canceled'
}
