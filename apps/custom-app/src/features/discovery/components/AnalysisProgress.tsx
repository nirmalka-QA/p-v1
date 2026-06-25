import { Box, Card, Title, Text, Stack, Group, ThemeIcon, Loader } from '@mantine/core'
import { IconCheck, IconX, IconCircle } from '@tabler/icons-react'
import type { AnalysisStep } from '../utility/models/model'

interface AnalysisProgressProps {
  steps: AnalysisStep[]
}

function StepIcon({ status }: { status: AnalysisStep['status'] }) {
  if (status === 'done') {
    return (
      <ThemeIcon color="teal" variant="light" size={22} radius="xl">
        <IconCheck size={13} />
      </ThemeIcon>
    )
  }
  if (status === 'running') {
    return <Loader color="orange" size={18} />
  }
  if (status === 'error') {
    return (
      <ThemeIcon color="red" variant="light" size={22} radius="xl">
        <IconX size={13} />
      </ThemeIcon>
    )
  }
  return (
    <ThemeIcon color="gray" variant="subtle" size={22} radius="xl">
      <IconCircle size={13} />
    </ThemeIcon>
  )
}

export function AnalysisProgress({ steps }: AnalysisProgressProps) {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const total = steps.length

  return (
    <Box maw={520}>
      <Title order={3} size="h3" mb={4}>
        Building Knowledge Base…
      </Title>
      <Text size="sm" c="dimmed" mb="lg">
        Step {Math.min(doneCount + 1, total)} of {total} — your browser tab is free while this runs
      </Text>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="xs">
          {steps.map((step) => (
            <Group key={step.id} justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <StepIcon status={step.status} />
                <Text
                  size="sm"
                  ff="monospace"
                  fw={step.status === 'running' ? 600 : 400}
                  c={step.status === 'pending' ? 'dimmed' : undefined}
                >
                  {step.label}
                </Text>
              </Group>
              <Text size="xs" ff="monospace" c={step.status === 'running' ? 'orange' : 'dimmed'}>
                {step.status === 'done' && step.estimatedSeconds
                  ? `${step.estimatedSeconds}s`
                  : step.status === 'running'
                  ? 'running…'
                  : ''}
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>
    </Box>
  )
}
