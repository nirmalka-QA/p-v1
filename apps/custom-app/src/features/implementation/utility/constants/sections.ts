import type { ComponentType } from 'react'
import {
  IconListCheck,
  IconLayoutDashboard,
  IconServer,
  IconDatabase,
  IconPalette,
  IconHistory,
} from '@tabler/icons-react'
import type { ImplementationSectionId } from '../models/model'

export interface ImplementationSectionConfig {
  id: ImplementationSectionId
  label: string
  icon: ComponentType<{ size?: number }>
  /** Route segment under `/projects/:id/implementation/`. */
  segment: string
}

/**
 * The Implementation workspace sections, in sidebar order. Data-driven so new
 * sections (Integrations, Connectors, …) are added by appending an entry plus a
 * page + route — no shell changes.
 */
export const IMPLEMENTATION_SECTIONS: ImplementationSectionConfig[] = [
  { id: 'stories', label: 'Stories', icon: IconListCheck, segment: 'stories' },
  { id: 'frontend', label: 'Frontend', icon: IconLayoutDashboard, segment: 'frontend' },
  { id: 'backend', label: 'Backend', icon: IconServer, segment: 'backend' },
  { id: 'database', label: 'Database', icon: IconDatabase, segment: 'database' },
  { id: 'design', label: 'Design', icon: IconPalette, segment: 'design' },
  { id: 'log', label: 'Implementation log', icon: IconHistory, segment: 'log' },
]
