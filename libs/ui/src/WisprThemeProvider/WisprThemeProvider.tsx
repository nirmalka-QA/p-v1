import type { ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import type { MantineColorScheme } from '@mantine/core'
import { mantineTheme } from '@wispr/tokens'

export interface WisprThemeProviderProps {
  children: ReactNode
  defaultColorScheme?: MantineColorScheme
}

/**
 * The one MantineProvider for the platform, themed with @wispr/tokens. The host
 * wraps the app in this; remotes inherit the theme through Mantine's context
 * (a federation singleton) and must NOT wrap their own provider in composed
 * mode. Remotes use it only in standalone dev (bootstrap.standalone.tsx).
 */
export function WisprThemeProvider({
  children,
  defaultColorScheme = 'light',
}: WisprThemeProviderProps) {
  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme={defaultColorScheme}>
      {children}
    </MantineProvider>
  )
}
