/**
 * @wispr/tokens — design tokens + Mantine theme.
 *
 * - `mantineTheme`: the theme object for MantineProvider (host-owned, singleton).
 * - `./tokens.css`: the --cl-* custom properties + base resets. Import the CSS
 *   side-effect once at the host entry: `import '@wispr/tokens/tokens.css'`.
 */
export { mantineTheme } from './theme'
