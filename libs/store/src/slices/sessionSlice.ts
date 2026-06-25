import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@wispr/contracts'

/**
 * Session state — the authenticated user and auth status. The access token is
 * NOT here (it lives in memory in @wispr/services); this slice holds only what
 * the UI renders and what RBAC is computed from. Not persisted.
 */
export type SessionStatus = 'anonymous' | 'authenticating' | 'authenticated'

export interface SessionState {
  user: User | null
  status: SessionStatus
}

const initialState: SessionState = { user: null, status: 'anonymous' }

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    authenticating(state) {
      state.status = 'authenticating'
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload
      state.status = 'authenticated'
    },
    clearSession(state) {
      state.user = null
      state.status = 'anonymous'
    },
  },
})

export const { authenticating, setUser, clearSession } = sessionSlice.actions
export const sessionReducer = sessionSlice.reducer
