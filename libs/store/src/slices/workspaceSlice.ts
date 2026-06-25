import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { WorkspaceRef } from '@wispr/contracts'

/** Active workspace + the list the user can switch between. */
export interface WorkspaceState {
  activeWorkspaceId: string | null
  workspaces: WorkspaceRef[]
}

const initialState: WorkspaceState = { activeWorkspaceId: null, workspaces: [] }

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setWorkspaces(state, action: PayloadAction<WorkspaceRef[]>) {
      state.workspaces = action.payload
    },
    setActiveWorkspace(state, action: PayloadAction<string | null>) {
      state.activeWorkspaceId = action.payload
    },
  },
})

export const { setWorkspaces, setActiveWorkspace } = workspaceSlice.actions
export const workspaceReducer = workspaceSlice.reducer
