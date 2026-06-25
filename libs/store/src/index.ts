/**
 * @wispr/store — the single Redux store (factory + slices + typed hooks), shared
 * at runtime as a Module Federation singleton. The host instantiates it once;
 * remotes import the typed hooks, slice actions and selectors from here.
 */
export { makeStore } from './store'
export type { AppStore, RootState, AppDispatch } from './store'
export { useAppDispatch, useAppSelector, useInjectReducer } from './hooks'

export {
  sessionReducer,
  authenticating,
  setUser,
  clearSession,
} from './slices/sessionSlice'
export type { SessionState, SessionStatus } from './slices/sessionSlice'

export {
  workspaceReducer,
  setWorkspaces,
  setActiveWorkspace,
} from './slices/workspaceSlice'
export type { WorkspaceState } from './slices/workspaceSlice'

export {
  themeReducer,
  setColorScheme,
  toggleColorScheme,
} from './slices/themeSlice'
export type { ThemeState, ColorScheme } from './slices/themeSlice'

export {
  toastsReducer,
  addToast,
  dismissToast,
} from './slices/toastsSlice'
export type { ToastsState, Toast, ToastType } from './slices/toastsSlice'
