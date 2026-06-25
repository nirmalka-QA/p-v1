import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

/** The active colour scheme. Mirrored into the contract's `theme` prop for remotes. */
export type ColorScheme = 'light' | 'dark'

export interface ThemeState {
  colorScheme: ColorScheme
}

const initialState: ThemeState = { colorScheme: 'light' }

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setColorScheme(state, action: PayloadAction<ColorScheme>) {
      state.colorScheme = action.payload
    },
    toggleColorScheme(state) {
      state.colorScheme = state.colorScheme === 'light' ? 'dark' : 'light'
    },
  },
})

export const { setColorScheme, toggleColorScheme } = themeSlice.actions
export const themeReducer = themeSlice.reducer
