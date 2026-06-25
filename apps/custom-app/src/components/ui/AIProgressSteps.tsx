import { Stack, Group, Text, ThemeIcon, Loader, Box } from '@mantine/core'
import { IconCheck, IconX, IconClock } from '@tabler/icons-react'
import type { AnalysisStep } from '../../types'
import styles from './ui.module.css'

const STEP_ICON: Record<AnalysisStep['status'], React.ReactNode> = {
  pending: <IconClock size={13} />,
  running: <Loader size={13} color="violet" />,
  done: <IconCheck size={13} />,
  error: <IconX size={13} />,
}

const STEP_COLOR: Record<AnalysisStep['status'], string> = {
  pending: 'gray',
  running: 'violet',
  done: 'teal',
  error: 'red',
}

interface AIProgressStepsProps {
  steps: AnalysisStep[]
}

export function AIProgressSteps({ steps }: AIProgressStepsProps) {
  return (
    <Stack gap="xs">
      {steps.map((step, index) => (
        <Group key={step.id} gap="sm" align="center" wrap="nowrap">
          <Box className={styles.stepIconWrap}>
            <ThemeIcon
              size={24}
              radius="xl"
              color={STEP_COLOR[step.status]}
              variant={step.status === 'pending' ? 'subtle' : 'light'}
            >
              {STEP_ICON[step.status]}
            </ThemeIcon>
            {index < steps.length - 1 && <Box className={styles.stepConnector} />}
          </Box>
          <Stack gap={0}>
            <Text
              size="sm"
              fw={step.status === 'running' ? 600 : 400}
              c={step.status === 'pending' ? 'dimmed' : undefined}
            >
              {step.label}
            </Text>
            {step.status === 'running' && step.estimatedSeconds && (
              <Text size="xs" c="dimmed">
                ~{step.estimatedSeconds}s
              </Text>
            )}
          </Stack>
        </Group>
      ))}
    </Stack>
  )
}
