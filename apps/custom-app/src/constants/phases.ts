import type { ComponentType } from 'react'
import type { Phase } from '../types'
import {
  IconSearch,
  IconLayoutList,
  IconList,
  IconCode,
  IconBug,
} from '@tabler/icons-react'

export type PhaseStatus = 'done' | 'active' | 'available' | 'locked'

export interface PhaseConfig {
  id: Phase
  label: string
  icon: ComponentType<{ size?: number; stroke?: number; className?: string }>
  order: number
  path: string
}

export const PHASES: PhaseConfig[] = [
  { id: 'discovery', label: 'Discovery', icon: IconSearch, order: 1, path: 'discovery' },
  { id: 'planning', label: 'Planning', icon: IconLayoutList, order: 2, path: 'planning' },
  { id: 'features', label: 'Features', icon: IconList, order: 3, path: 'features' },
  { id: 'implementation', label: 'Implementation', icon: IconCode, order: 4, path: 'implementation' },
  { id: 'test', label: 'Test', icon: IconBug, order: 5, path: 'test' },
]

export const PHASE_ORDER: Phase[] = ['discovery', 'planning', 'features', 'implementation', 'test']

/** The phase every new project starts in. */
export const INITIAL_PHASE: Phase = PHASE_ORDER[0]

/** Display label per phase — single source of truth for phase naming in UI. */
export const PHASE_LABEL: Record<Phase, string> = {
  discovery: 'Discovery',
  planning: 'Planning',
  features: 'Features',
  implementation: 'Implementation',
  test: 'Test',
}

/** Short status caption shown under each phase in the rail. */
export const PHASE_META_LABEL: Record<Phase, string> = {
  discovery: 'knowledge base',
  planning: 'feature planning',
  features: 'user stories',
  implementation: 'code generation',
  test: 'quality & coverage',
}

/**
 * One-line purpose of each phase — shown in the rail tooltip on hover so the
 * user understands what the phase is for and what it produces.
 */
export const PHASE_DESCRIPTION: Record<Phase, string> = {
  discovery:
    'Turn uploaded files, transcripts, and notes into a structured Knowledge Base that grounds every later phase.',
  planning:
    'Review and approve the AI-proposed feature list built from the Knowledge Base before work begins.',
  features:
    'Break approved features into user stories and mark them Ready for Dev.',
  implementation:
    'Generate code from Ready stories against your tech stack, then browse the resulting repository.',
  test:
    'Create and track test cases with pass/fail status for implemented stories.',
}

/** Mantine theme color name per phase — used by badges and indicators. */
export const PHASE_COLOR: Record<Phase, string> = {
  discovery: 'gray',
  planning: 'indigo',
  features: 'grape',
  implementation: 'orange',
  test: 'teal',
}
