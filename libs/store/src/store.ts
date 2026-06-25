import { combineReducers, configureStore } from '@reduxjs/toolkit'
import type { Reducer } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { api } from '@wispr/services'
import { sessionReducer } from './slices/sessionSlice'
import { workspaceReducer } from './slices/workspaceSlice'
import { themeReducer } from './slices/themeSlice'
import { toastsReducer } from './slices/toastsSlice'

// The always-present reducers. RootState is derived from these; remote-local
// slices are added at runtime via injectReducer and typed by the remote.
const staticReducers = {
  [api.reducerPath]: api.reducer,
  session: sessionReducer,
  workspace: workspaceReducer,
  theme: themeReducer,
  toasts: toastsReducer,
}

/**
 * The single store factory. ONLY the host calls makeStore() and wraps
 * <Provider store>. Remotes consume the same store via react-redux (a federation
 * singleton) and never call configureStore themselves — that's what guarantees
 * one cache and one set of slices at runtime.
 *
 * A remote contributes its own client slices at mount via `store.injectReducer`
 * (the host store can't know every remote's slices ahead of time).
 */
export const makeStore = () => {
  const injectedReducers: Record<string, Reducer> = {}
  const buildRootReducer = () => combineReducers({ ...staticReducers, ...injectedReducers })

  const store = configureStore({
    reducer: buildRootReducer(),
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  })

  // Enables refetchOnFocus / refetchOnReconnect behaviours for RTK Query.
  setupListeners(store.dispatch)

  /**
   * Attach a remote-local slice reducer to the single store at runtime. Idempotent
   * (re-injecting the same key is a no-op), so a remote can safely register on
   * every mount. The remote types its own slice into RootState.
   */
  const injectReducer = (key: string, reducer: Reducer): void => {
    if (Object.prototype.hasOwnProperty.call(injectedReducers, key)) return
    injectedReducers[key] = reducer
    store.replaceReducer(buildRootReducer())
  }

  return Object.assign(store, { injectReducer })
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
