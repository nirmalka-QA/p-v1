import { skipToken } from '@reduxjs/toolkit/query'
import { useEffect, useRef, useState } from 'react'
import { API_ENDPOINTS, isOperationTerminal } from '@wispr/contracts'
import type { SkillOperation } from '@wispr/contracts'
import { api } from './api'

/**
 * The async-operation progress endpoint (Phase 10 / ADR-0072) — injected into the shared RTK Query api so any feature
 * polls a module's durable operation the same way. `module` is the route prefix (e.g. 'requirements', 'strategy').
 */
export const operationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOperation: build.query<SkillOperation, { module: string; operationId: string; sinceSeq?: number }>({
      query: ({ module, operationId, sinceSeq }) => ({
        url: API_ENDPOINTS.operation(module, operationId),
        method: 'get',
        params: sinceSeq ? { sinceSeq } : undefined,
      }),
    }),
  }),
})

export const { useGetOperationQuery } = operationsApi

/**
 * Watch a durable operation: polls until it reaches a terminal state (then stops), honoring the backend-preconfigured
 * poll cadence (`delivery.pollIntervalMs`). Returns the live snapshot + whether it's still running. (SSE delivery is a
 * future mode; poll is the default the backend sets.) Pass a null/undefined id to idle.
 */
export function useOperation(moduleName: string, operationId: string | null | undefined) {
  const [done, setDone] = useState(false)
  const intervalRef = useRef(1500)

  // Reset when the watched operation changes (e.g. a new generation run).
  useEffect(() => {
    setDone(false)
  }, [operationId])

  const result = useGetOperationQuery(
    operationId && !done ? { module: moduleName, operationId } : skipToken,
    { pollingInterval: done ? 0 : intervalRef.current },
  )

  const operation = result.data ?? null
  useEffect(() => {
    if (!operation) return
    if (operation.delivery?.pollIntervalMs) intervalRef.current = operation.delivery.pollIntervalMs
    if (isOperationTerminal(operation.status)) setDone(true)
  }, [operation])

  return {
    operation,
    isRunning: !!operation && !isOperationTerminal(operation.status),
    isError: result.isError,
    error: result.error,
  }
}
