import type { TechStackItem, ProjectType, SetupStatus, DesignAssets } from '../models/model'
import { STACK_CAT, suggestedStackFor } from '../constants/constants'

/** The flat set of tech-stack choices the setup wizard / section pages edit. */
export interface StackSelection {
  feFramework: string
  feLanguage: string
  uiLibrary: string
  stateManagement: string
  beFramework: string
  beLanguage: string
  orm: string
  database: string
}

function valueFor(items: TechStackItem[], category: string): string {
  return items.find((i) => i.category === category)?.value ?? ''
}

/** AI-suggested defaults for a project type, mapped to the wizard's flat shape. */
export function defaultSelection(type: ProjectType): StackSelection {
  const s = suggestedStackFor(type)
  return {
    feFramework: s['Frontend Framework'],
    feLanguage: s['Language'],
    uiLibrary: s['UI Library'],
    stateManagement: s['State Management'],
    beFramework: s['Backend'],
    beLanguage: s['Backend'].startsWith('Python') ? 'Python' : 'TypeScript',
    orm: 'Prisma',
    database: s['Database'].split(' ')[0],
  }
}

/** Current selection from saved items, falling back to the suggested defaults. */
export function selectionFromItems(items: TechStackItem[], type: ProjectType): StackSelection {
  const d = defaultSelection(type)
  return {
    feFramework: valueFor(items, STACK_CAT.feFramework) || d.feFramework,
    feLanguage: valueFor(items, STACK_CAT.feLanguage) || d.feLanguage,
    uiLibrary: valueFor(items, STACK_CAT.uiLibrary) || d.uiLibrary,
    stateManagement: valueFor(items, STACK_CAT.stateManagement) || d.stateManagement,
    beFramework: valueFor(items, STACK_CAT.beFramework) || d.beFramework,
    beLanguage: valueFor(items, STACK_CAT.beLanguage) || d.beLanguage,
    orm: valueFor(items, STACK_CAT.orm) || d.orm,
    database: valueFor(items, STACK_CAT.database) || d.database,
  }
}

/** Builds the persisted item list from a selection (aiSuggested resolved on save). */
export function itemsFromSelection(sel: StackSelection): TechStackItem[] {
  const entries: [string, string][] = [
    [STACK_CAT.feFramework, sel.feFramework],
    [STACK_CAT.feLanguage, sel.feLanguage],
    [STACK_CAT.uiLibrary, sel.uiLibrary],
    [STACK_CAT.stateManagement, sel.stateManagement],
    [STACK_CAT.beFramework, sel.beFramework],
    [STACK_CAT.beLanguage, sel.beLanguage],
    [STACK_CAT.orm, sel.orm],
    [STACK_CAT.database, sel.database],
  ]
  return entries
    .filter(([, value]) => value.trim().length > 0)
    .map(([category, value]) => ({ category, value: value.trim(), aiSuggested: false }))
}

// ── Per-section setup status (drives the sidebar dots) ──

export function frontendStatus(items: TechStackItem[]): SetupStatus {
  const hasFramework = Boolean(valueFor(items, STACK_CAT.feFramework))
  const hasExtras = Boolean(valueFor(items, STACK_CAT.uiLibrary) && valueFor(items, STACK_CAT.feLanguage))
  if (hasFramework && hasExtras) return 'complete'
  if (hasFramework) return 'partial'
  return 'untouched'
}

export function backendStatus(items: TechStackItem[]): SetupStatus {
  const hasFramework = Boolean(valueFor(items, STACK_CAT.beFramework))
  const hasExtras = Boolean(valueFor(items, STACK_CAT.orm))
  if (hasFramework && hasExtras) return 'complete'
  if (hasFramework) return 'partial'
  return 'untouched'
}

export function databaseStatus(items: TechStackItem[]): SetupStatus {
  return valueFor(items, STACK_CAT.database) ? 'complete' : 'untouched'
}

export function designStatus(assets: DesignAssets | null): SetupStatus {
  if (!assets) return 'untouched'
  const signals = [assets.figmaUrl, assets.notes, assets.tokens, assets.uploads.length > 0].filter(Boolean)
  if (signals.length >= 2) return 'complete'
  if (signals.length === 1) return 'partial'
  return 'untouched'
}

/** Which tech-stack categories belong to each section. */
export type StackArea = 'frontend' | 'backend' | 'database'
export const AREA_CATEGORIES: Record<StackArea, string[]> = {
  frontend: [STACK_CAT.feFramework, STACK_CAT.feLanguage, STACK_CAT.uiLibrary, STACK_CAT.stateManagement],
  backend: [STACK_CAT.beFramework, STACK_CAT.beLanguage, STACK_CAT.orm],
  database: [STACK_CAT.database],
}

/**
 * Merges one section's selection into the saved items WITHOUT touching the other
 * sections — so saving Frontend setup doesn't wipe the Backend/Database choices.
 */
export function mergeAreaItems(existing: TechStackItem[], selection: StackSelection, area: StackArea): TechStackItem[] {
  const owned = new Set(AREA_CATEGORIES[area])
  const kept = existing.filter((i) => !owned.has(i.category))
  const areaItems = itemsFromSelection(selection).filter((i) => owned.has(i.category))
  return [...kept, ...areaItems]
}
