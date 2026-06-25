/**
 * Normalises an arbitrary design-tokens JSON object into flat, displayable
 * groups (colours, typography, spacing, radii, other) so the Tokens tab can
 * render swatches and a type scale without assuming one specific token schema.
 */

export interface DesignTokenEntry {
  name: string
  value: string
  isColor: boolean
}

export interface ParsedDesignTokens {
  colors: DesignTokenEntry[]
  typography: DesignTokenEntry[]
  spacing: DesignTokenEntry[]
  radii: DesignTokenEntry[]
  other: DesignTokenEntry[]
}

const COLOR_RE = /^(#([0-9a-f]{3,8})|rg(b|ba)?\(|hsl(a)?\(|var\(--)/i

/** Whether a token value reads as a CSS colour (hex / rgb / hsl / var). */
export function isColorValue(value: string): boolean {
  return COLOR_RE.test(value.trim())
}

/** Flattens nested token objects to `parent.child` dotted keys with string values. */
function flatten(input: Record<string, unknown>, prefix = ''): DesignTokenEntry[] {
  const out: DesignTokenEntry[] = []
  for (const [key, raw] of Object.entries(input)) {
    const name = prefix ? `${prefix}.${key}` : key
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
      out.push(...flatten(raw as Record<string, unknown>, name))
    } else {
      const value = Array.isArray(raw) ? raw.join(', ') : String(raw)
      out.push({ name, value, isColor: isColorValue(value) })
    }
  }
  return out
}

function classify(entry: DesignTokenEntry): keyof ParsedDesignTokens {
  if (entry.isColor) return 'colors'
  const key = entry.name.toLowerCase()
  if (/(font|text|type|letter|line-height|leading|tracking|weight)/.test(key)) return 'typography'
  if (/(radius|round|corner)/.test(key)) return 'radii'
  if (/(space|spacing|gap|margin|padding|size|width|height|inset)/.test(key)) return 'spacing'
  return 'other'
}

/** Parses the stored tokens object into grouped, displayable entries. */
export function parseDesignTokens(tokens: Record<string, unknown> | undefined): ParsedDesignTokens {
  const groups: ParsedDesignTokens = { colors: [], typography: [], spacing: [], radii: [], other: [] }
  if (!tokens) return groups
  for (const entry of flatten(tokens)) {
    groups[classify(entry)].push(entry)
  }
  return groups
}

/** Total token count across all groups — used for empty-state detection. */
export function tokenCount(parsed: ParsedDesignTokens): number {
  return (
    parsed.colors.length +
    parsed.typography.length +
    parsed.spacing.length +
    parsed.radii.length +
    parsed.other.length
  )
}
