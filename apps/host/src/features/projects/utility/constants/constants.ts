import {
  IconCode,
  IconArrowsExchange,
  IconChartBar,
  IconBuildingFactory2,
  IconShield,
  IconCompass,
  IconFlask,
  IconBriefcase,
} from '@tabler/icons-react'
import type { Icon } from '@tabler/icons-react'
import type { ProjectType } from '@wispr/contracts'

/**
 * Presentation metadata for each federation project type (the prototype's "Type").
 * Host-side because it's pure UI: a Tabler icon + a Mantine palette name (never hex)
 * + the label/tag for synchronous display on the card and list filter. The
 * authoritative list + availability come from GET /project-type-catalog; this map
 * only adds how each type looks. Keys mirror the @wispr/contracts ProjectType enum.
 */
export interface ProjectTypeMeta {
  label: string
  tag: string
  icon: Icon
  /** Mantine palette name used for the icon + accent (resolved by Mantine, no hex). */
  colorSeed: string
}

export const PROJECT_TYPE_META: Record<ProjectType, ProjectTypeMeta> = {
  'custom-app': { label: 'Custom App', tag: 'CUSTOM APP', icon: IconCode, colorSeed: 'indigo' },
  strategy: { label: 'Strategy', tag: 'STRATEGY', icon: IconCompass, colorSeed: 'pink' },
  'data-pipeline': { label: 'Data Pipeline', tag: 'DATA', icon: IconArrowsExchange, colorSeed: 'teal' },
  'analytics-bi': { label: 'Analytics & BI', tag: 'ANALYTICS', icon: IconChartBar, colorSeed: 'orange' },
  sap: { label: 'SAP', tag: 'SAP', icon: IconBuildingFactory2, colorSeed: 'blue' },
  guidewire: { label: 'Guidewire', tag: 'GUIDEWIRE', icon: IconShield, colorSeed: 'violet' },
  testing: { label: 'Testing', tag: 'TESTING', icon: IconFlask, colorSeed: 'grape' },
}

/** Safe label lookup for a project type key (falls back to the raw key). */
export function projectTypeLabel(key: ProjectType | string): string {
  return PROJECT_TYPE_META[key as ProjectType]?.label ?? String(key)
}

/** Short uppercase tag for a project type (the prototype's mono type chip). */
export function projectTypeTag(key: ProjectType | string): string {
  return PROJECT_TYPE_META[key as ProjectType]?.tag ?? String(key).toUpperCase()
}

/** Mantine palette name for a project type's chip/accent (never a hex value). */
export function projectTypeColor(key: ProjectType | string): string {
  return PROJECT_TYPE_META[key as ProjectType]?.colorSeed ?? 'gray'
}

/** One ready-made solution in the "By category" picker; maps to a federation type. */
export interface SolutionItem {
  name: string
  description: string
  /** The federation project type this solution creates (selects the remote). */
  maps: ProjectType
}

/** A category grouping related solutions (the wizard's "By category" mode). */
export interface SolutionCategory {
  key: string
  name: string
  description: string
  icon: Icon
  /** Mantine palette name for the category header accent (never a hex value). */
  colorSeed: string
  solutions: SolutionItem[]
}

/**
 * Solution catalogue for the wizard's "By category" type picker (the prototype's
 * SOLUTION_CATS). Each solution maps down to one of the seven federation project
 * types; availability is resolved from the project-type catalog at render time.
 */
export const SOLUTION_CATS: SolutionCategory[] = [
  {
    key: 'biz',
    name: 'Business',
    description: 'Strategy, research & analysis',
    icon: IconBriefcase,
    colorSeed: 'pink',
    solutions: [
      { name: 'Strategy', description: 'Shape strategy, roadmaps, and OKRs', maps: 'strategy' },
      { name: 'Research', description: 'Run market and user research to inform decisions', maps: 'strategy' },
      { name: 'Requirements', description: 'Capture and structure business requirements', maps: 'strategy' },
    ],
  },
  {
    key: 'eng',
    name: 'Engineering',
    description: 'Build, data & platforms',
    icon: IconCode,
    colorSeed: 'indigo',
    solutions: [
      { name: 'Frontend', description: 'Build responsive web UIs and single-page apps', maps: 'custom-app' },
      { name: 'Mobile App', description: 'Ship native iOS and Android applications', maps: 'custom-app' },
      { name: 'APIs & Backend', description: 'Build services, APIs, and backend systems', maps: 'custom-app' },
      { name: 'Database', description: 'Design schemas, stores, and migrations', maps: 'data-pipeline' },
      { name: 'ETL / Data Pipeline', description: 'Move and transform data with reliable pipelines', maps: 'data-pipeline' },
      { name: 'Analytics & BI', description: 'Build dashboards and reporting from your data', maps: 'analytics-bi' },
      { name: 'SAP', description: 'Configure and extend SAP S/4HANA and ABAP', maps: 'sap' },
      { name: 'Guidewire', description: 'Configure Guidewire PolicyCenter and product models', maps: 'guidewire' },
    ],
  },
  {
    key: 'test',
    name: 'Testing',
    description: 'Quality & validation',
    icon: IconFlask,
    colorSeed: 'grape',
    solutions: [
      { name: 'Test Automation', description: 'Automate regression suites for repeatable testing', maps: 'testing' },
      { name: 'Load Testing', description: 'Validate scalability and throughput under load', maps: 'testing' },
      { name: 'Performance', description: 'Profile and optimise latency and resource use', maps: 'testing' },
      { name: 'Security Testing', description: 'Find vulnerabilities with pen tests and scans', maps: 'testing' },
    ],
  },
]

/** A stable id for a solution card (category + index), used for selection highlight. */
export function solutionId(categoryKey: string, index: number): string {
  return `${categoryKey}:${index}`
}
