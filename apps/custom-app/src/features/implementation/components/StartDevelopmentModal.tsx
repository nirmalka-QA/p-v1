import type { ComponentType } from 'react'
import { Modal, Stack, Group, Box, Text, Alert, UnstyledButton, Paper, ThemeIcon } from '@mantine/core'
import { IconStack2, IconLayoutDashboard, IconServer, IconAlertTriangle } from '@tabler/icons-react'
import type { Story } from '../utility/models/model'
import styles from '../utility/styles/implementation.module.css'

/** Which side(s) of the stack to generate when starting a story. */
export type DevScope = 'all' | 'frontend' | 'backend'

interface ScopeOption {
  scope: DevScope
  label: string
  desc: string
  icon: ComponentType<{ size?: number }>
}

interface StartDevelopmentModalProps {
  story: Story | null
  opened: boolean
  /** Only stack-configured areas are offered. */
  frontendAvailable: boolean
  backendAvailable: boolean
  /** A different story already in progress — warn about splitting focus. */
  inProgressStoryId: string | null
  onConfirm: (scope: DevScope) => void
  onClose: () => void
}

/**
 * Asks which scope to develop for a story (All / Frontend / Backend, limited to
 * configured areas) before moving the developer into the workspace. Surfaces a
 * deep-work warning if another story is already in progress.
 */
export function StartDevelopmentModal({
  story,
  opened,
  frontendAvailable,
  backendAvailable,
  inProgressStoryId,
  onConfirm,
  onClose,
}: StartDevelopmentModalProps) {
  const options: ScopeOption[] = []
  if (frontendAvailable && backendAvailable) {
    options.push({ scope: 'all', label: 'Full stack', desc: 'Generate frontend and backend for this story.', icon: IconStack2 })
  }
  if (frontendAvailable) {
    options.push({ scope: 'frontend', label: 'Frontend only', desc: 'UI components, hooks, and state.', icon: IconLayoutDashboard })
  }
  if (backendAvailable) {
    options.push({ scope: 'backend', label: 'Backend only', desc: 'APIs, services, and data access.', icon: IconServer })
  }

  return (
    <Modal opened={opened} onClose={onClose} title={story ? `Start development — ${story.id}` : 'Start development'} centered>
      <Stack gap="md">
        {story && (
          <Text size="sm" fw={500}>
            {story.title}
          </Text>
        )}

        {inProgressStoryId && (
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {inProgressStoryId} is already in progress. For focused, predictable work, finish it before starting another.
          </Alert>
        )}

        {options.length === 0 ? (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            Configure a frontend or backend stack in setup before starting development.
          </Alert>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              What should we generate for this story?
            </Text>
            <Stack gap="xs">
              {options.map((opt) => {
                const Icon = opt.icon
                return (
                  <UnstyledButton key={opt.scope} onClick={() => onConfirm(opt.scope)}>
                    <Paper withBorder radius="md" p="sm" className={styles.optionCard}>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={34} radius="md" variant="light" color="indigo">
                          <Icon size={18} />
                        </ThemeIcon>
                        <Box>
                          <Text fw={600} size="sm">
                            {opt.label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {opt.desc}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  </UnstyledButton>
                )
              })}
            </Stack>
          </>
        )}
      </Stack>
    </Modal>
  )
}
