import { useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'
import type { Reducer } from '@reduxjs/toolkit'
import type { RootState, AppDispatch, AppStore } from './store'

/** Typed Redux hooks — use these everywhere instead of the untyped originals. */
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * Register a remote-local slice reducer onto the single store. A remote calls
 * this at the top of its entry component so the slice exists before any
 * descendant selects from it. Idempotent and synchronous (runs once, during the
 * first render, via the useState initializer).
 */
export function useInjectReducer(key: string, reducer: Reducer): void {
  const store = useStore() as AppStore
  useState(() => {
    store.injectReducer(key, reducer)
    return null
  })
}
