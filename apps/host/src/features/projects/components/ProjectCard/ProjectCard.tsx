import { Box, Group, Avatar, Text, Badge, Menu, ActionIcon } from '@mantine/core'
import { IconDots, IconArrowRight, IconSettings } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from '@wispr/projects'
import { projectColor, projectInitials } from '@wispr/projects'
import type { Project } from '@wispr/projects'
import { projectTypeTag, projectTypeColor } from '../../utility/constants/constants'
import styles from './ProjectCard.module.css'

dayjs.extend(relativeTime)

interface ProjectCardProps {
  project: Project
  onOpen: (project: Project) => void
  /** Optional actions-menu entry — open the project's settings (host sets ?settings=). */
  onOpenSettings?: (project: Project) => void
}

/** A project row in the workspace list — the prototype's `.prow`. Click opens the
 *  project; the ⋯ menu exposes open + settings without leaving the list. */
export function ProjectCard({ project, onOpen, onOpenSettings }: ProjectCardProps) {
  const phase = PROJECT_STATUS_LABEL[project.status] ?? 'New'
  // Industry is optional; 'other' is the unspecified default, so only show a real one.
  const industry = project.type !== 'other' ? PROJECT_TYPE_LABEL[project.type] : null

  return (
    <Box
      className={styles.row ?? ''}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(project)}
    >
      <Avatar color={projectColor(project.id)} variant="filled" radius="md" size={40} ff="monospace" fw={700}>
        {projectInitials(project.name)}
      </Avatar>

      <Box className={styles.main ?? ''}>
        <Text className={styles.name ?? ''}>{project.name}</Text>
        <Text className={styles.desc ?? ''}>{project.description}</Text>
        <Box className={styles.meta ?? ''}>
          <Box className={styles.phaseDot ?? ''} />
          {phase}
          {industry ? ` · ${industry}` : ''} · Updated {dayjs(project.updatedAt).fromNow()}
        </Box>
      </Box>

      <Box className={styles.right ?? ''}>
        <Group gap={6} wrap="nowrap">
          <Badge
            variant="light"
            color={projectTypeColor(project.projectType)}
            radius="sm"
            className={styles.typeChip ?? ''}
          >
            {projectTypeTag(project.projectType)}
          </Badge>
          <Menu position="bottom-end" withinPortal shadow="md" width={190}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Project actions"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
              <Menu.Item leftSection={<IconArrowRight size={14} />} onClick={() => onOpen(project)}>
                Open project
              </Menu.Item>
              {onOpenSettings ? (
                <Menu.Item
                  leftSection={<IconSettings size={14} />}
                  onClick={() => onOpenSettings(project)}
                >
                  Project settings
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>
    </Box>
  )
}
