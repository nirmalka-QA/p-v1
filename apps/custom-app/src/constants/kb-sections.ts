import type { ComponentType } from 'react'
import type { KBSectionId } from '../types'
import {
  IconFileDescription,
  IconAlertTriangle,
  IconBulb,
  IconBuildingArch,
  IconStack2,
  IconCalendarEvent,
  IconUsers,
  IconHelp,
  IconNotes,
} from '@tabler/icons-react'

export interface KBSectionConfig {
  id: KBSectionId
  label: string
  description: string
  icon: ComponentType<{ size?: number; stroke?: number }>
}

export const KB_SECTIONS: KBSectionConfig[] = [
  {
    id: 'business-requirements',
    label: 'Business Requirements',
    description: 'Core business objectives, goals, and functional requirements that define the scope of the project.',
    icon: IconFileDescription,
  },
  {
    id: 'problem-statements',
    label: 'Problem Statements',
    description: 'Key problems, pain points, and challenges that this project is designed to solve.',
    icon: IconAlertTriangle,
  },
  {
    id: 'proposed-solutions',
    label: 'Proposed Solutions',
    description: 'Suggested approaches, methodologies, and solutions to address the identified problems.',
    icon: IconBulb,
  },
  {
    id: 'architectural-notes',
    label: 'Architectural Notes',
    description: 'System design decisions, technical architecture choices, and infrastructure considerations.',
    icon: IconBuildingArch,
  },
  {
    id: 'tech-stack',
    label: 'Tech Stack',
    description: 'Technologies, frameworks, libraries, and tools used or planned for this project.',
    icon: IconStack2,
  },
  {
    id: 'timeline',
    label: 'Timeline & Milestones',
    description: 'Key dates, deadlines, delivery milestones, and sprint plans.',
    icon: IconCalendarEvent,
  },
  {
    id: 'stakeholders',
    label: 'Stakeholders',
    description: 'Key people involved, their roles, responsibilities, and contact information.',
    icon: IconUsers,
  },
  {
    id: 'open-questions',
    label: 'Open Questions',
    description: 'Unresolved questions, decisions pending, and items that need clarification.',
    icon: IconHelp,
  },
  {
    id: 'other-notes',
    label: 'Other Notes',
    description: "Miscellaneous context, background information, and notes that don't fit other sections.",
    icon: IconNotes,
  },
]
