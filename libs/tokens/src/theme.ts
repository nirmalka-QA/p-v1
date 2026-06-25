import {
  createTheme,
  defaultVariantColorsResolver,
  Card,
  Paper,
  Modal,
  Drawer,
  Menu,
  Popover,
  Tooltip,
} from '@mantine/core'
import type { VariantColorsResolver } from '@mantine/core'

/**
 * @wispr/tokens — the Mantine theme object derived from the design-token CSS
 * variables in `tokens.css`. The host wraps the app in one MantineProvider with
 * this theme; remotes inherit it through the Mantine singleton context.
 *
 * The theme intentionally references `var(--cl-*)` tokens rather than hardcoding
 * colours, so light/dark flips happen purely in CSS (see tokens.css).
 */

// Elevated-surface colour — white in light, #131316 in dark (see tokens.css).
// Used so cards, panels, modals and dropdowns match the prototype's --bg-elev
// instead of Mantine's default dark surface (var(--mantine-color-dark-6)).
const ELEV = 'var(--cl-bg-elev)'

// Custom "accent" variant for primary actions. Driven by the theme tokens that
// flip per colour scheme: slate bg + white text in light, white bg + black text
// in dark — matching the prototype's primary button.
const variantColorResolver: VariantColorsResolver = (input) => {
  if (input.variant === 'accent') {
    return {
      background: 'var(--cl-accent)',
      hover: 'var(--cl-accent-hover)',
      color: 'var(--cl-text-on-acc)',
      border: 'none',
    }
  }
  return defaultVariantColorsResolver(input)
}

export const mantineTheme = createTheme({
  primaryColor: 'indigo',
  variantColorResolver,
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  defaultRadius: 6,
  headings: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '28px' },
      h2: { fontSize: '22px' },
      h3: { fontSize: '17px' },
      h4: { fontSize: '14px' },
    },
  },
  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '14px',
    lg: '16px',
    xl: '18px',
  },
  lineHeights: {
    xs: '1.4',
    sm: '1.45',
    md: '1.6',
    lg: '1.7',
    xl: '1.8',
  },
  components: {
    Tooltip: Tooltip.extend({ defaultProps: { withArrow: true } }),

    // Elevated surfaces → --cl-bg-elev (both themes)
    Paper: Paper.extend({ defaultProps: { bg: ELEV } }),
    Card: Card.extend({ defaultProps: { bg: ELEV } }),
    Modal: Modal.extend({
      styles: {
        content: { backgroundColor: ELEV },
        header: { backgroundColor: ELEV },
      },
    }),
    Drawer: Drawer.extend({
      styles: {
        content: { backgroundColor: ELEV },
        header: { backgroundColor: ELEV },
      },
    }),
    Menu: Menu.extend({ styles: { dropdown: { backgroundColor: ELEV } } }),
    Popover: Popover.extend({ styles: { dropdown: { backgroundColor: ELEV } } }),
  },
})
