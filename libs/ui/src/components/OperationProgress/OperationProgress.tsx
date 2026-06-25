import { Stack, Group, Text, Progress, ThemeIcon, Loader, Button } from '@mantine/core'
import { IconCircleCheck, IconCircleX, IconPoint, IconAlertTriangle } from '@tabler/icons-react'
import type { SkillOperation, OperationStep } from '@wispr/contracts'

interface OperationProgressProps {
  /** The live operation snapshot (from `useOperation`); null renders nothing. */
  operation: SkillOperation | null
  /** Optional cancel handler — shown while the operation is still running. */
  onCancel?: () => void
}

/**
 * Renders a durable operation's live progress (Phase 10 / ADR-0072): the "what it's doing" activity line (e.g.
 * "Pushing code using the WISPR Azure DevOps skill"), an optional percent bar, and the coarse step list. Purely
 * presentational — feed it the snapshot from `useOperation`. Shared so every module shows progress the same way.
 */
export function OperationProgress({ operation, onCancel }: OperationProgressProps) {
  if (!operation) return null

  const running = operation.status === 'running' || operation.status === 'pending'

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {running ? <Loader size="xs" /> : <StatusIcon status={operation.status} />}
          <Text fw={600} size="sm">
            {operation.activity ?? StatusLabel(operation.status)}
          </Text>
        </Group>
        {running && onCancel ? (
          <Button variant="subtle" size="compact-xs" color="red" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </Group>

      {typeof operation.percent === 'number' ? <Progress value={operation.percent} size="sm" radius="sm" /> : null}

      {operation.steps.length > 0 ? (
        <Stack gap={4}>
          {operation.steps.map((step) => (
            <StepRow key={step.key} step={step} />
          ))}
        </Stack>
      ) : null}

      {operation.failure ? (
        <Text size="xs" c="red">
          {operation.failure.message}
        </Text>
      ) : null}
    </Stack>
  )
}

function StepRow({ step }: { step: OperationStep }) {
  return (
    <Group gap="xs" wrap="nowrap">
      {step.status === 'running' ? <Loader size={14} /> : <StepIcon status={step.status} />}
      <Text size="sm" {...(step.status === 'pending' ? { c: 'dimmed' } : {})}>
        {step.label}
      </Text>
    </Group>
  )
}

function StatusIcon({ status }: { status: SkillOperation['status'] }) {
  if (status === 'succeeded') {
    return (
      <ThemeIcon size="sm" radius="xl" color="teal" variant="light">
        <IconCircleCheck size={14} />
      </ThemeIcon>
    )
  }
  return (
    <ThemeIcon size="sm" radius="xl" color={status === 'canceled' ? 'gray' : 'red'} variant="light">
      <IconCircleX size={14} />
    </ThemeIcon>
  )
}

function StepIcon({ status }: { status: OperationStep['status'] }) {
  if (status === 'done') {
    return (
      <ThemeIcon size={18} radius="xl" color="teal" variant="light">
        <IconCircleCheck size={12} />
      </ThemeIcon>
    )
  }
  if (status === 'failed') {
    return (
      <ThemeIcon size={18} radius="xl" color="red" variant="light">
        <IconAlertTriangle size={12} />
      </ThemeIcon>
    )
  }
  return (
    <ThemeIcon size={18} radius="xl" color="gray" variant="light">
      <IconPoint size={12} />
    </ThemeIcon>
  )
}

function StatusLabel(status: SkillOperation['status']): string {
  switch (status) {
    case 'succeeded':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'canceled':
      return 'Canceled'
    default:
      return 'Working…'
  }
}
