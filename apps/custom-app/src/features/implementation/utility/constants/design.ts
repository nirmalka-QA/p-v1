import type { ComponentType } from 'react'
import {
  IconPlugConnected,
  IconPalette,
  IconPhoto,
  IconComponents,
  IconBrandFigma,
  IconBook2,
  IconFileText,
  IconLink,
} from '@tabler/icons-react'
import type { DesignReferenceCategory } from '../models/model'
import { AI_FORMAT_FILENAME, type AiInstructionFormat } from '../helpers/mockAiInstructions'

/** Sub-sections of the Implementation › Design workspace, in tab order. */
export type DesignTabId = 'connections' | 'tokens' | 'mockups'

export interface DesignTabConfig {
  id: DesignTabId
  label: string
  icon: ComponentType<{ size?: number }>
}

export const DESIGN_TABS: DesignTabConfig[] = [
  { id: 'connections', label: 'Connections & References', icon: IconPlugConnected },
  { id: 'tokens', label: 'Design Tokens', icon: IconPalette },
  { id: 'mockups', label: 'Mockups Library', icon: IconPhoto },
]

export const DEFAULT_DESIGN_TAB: DesignTabId = 'connections'

/** Reference-link categories with display label and icon. */
export interface DesignReferenceCategoryConfig {
  id: DesignReferenceCategory
  label: string
  icon: ComponentType<{ size?: number }>
}

export const DESIGN_REFERENCE_CATEGORIES: DesignReferenceCategoryConfig[] = [
  { id: 'design-system', label: 'Design System', icon: IconComponents },
  { id: 'brand', label: 'Brand Guidelines', icon: IconBrandFigma },
  { id: 'storybook', label: 'Storybook', icon: IconBook2 },
  { id: 'documentation', label: 'Documentation', icon: IconFileText },
  { id: 'other', label: 'Other', icon: IconLink },
]

export const DEFAULT_REFERENCE_CATEGORY: DesignReferenceCategory = 'design-system'

/** AI instruction file formats offered in the AI Instructions tab. */
export interface AiFormatOption {
  value: AiInstructionFormat
  label: string
  filename: string
}

export const AI_FORMAT_OPTIONS: AiFormatOption[] = [
  { value: 'claude', label: 'Claude Code', filename: AI_FORMAT_FILENAME.claude },
  { value: 'cursor', label: 'Cursor', filename: AI_FORMAT_FILENAME.cursor },
  { value: 'copilot', label: 'GitHub Copilot', filename: AI_FORMAT_FILENAME.copilot },
]
