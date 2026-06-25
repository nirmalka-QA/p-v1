import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export type ToastType = 'info' | 'success' | 'error'

export interface Toast {
  id: string
  title?: string
  message: string
  type: ToastType
}

/** Host-owned notification queue backing `services.notify`. */
export interface ToastsState {
  items: Toast[]
}

const initialState: ToastsState = { items: [] }

const toastsSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Toast>) {
      state.items.push(action.payload)
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t.id !== action.payload)
    },
  },
})

export const { addToast, dismissToast } = toastsSlice.actions
export const toastsReducer = toastsSlice.reducer
