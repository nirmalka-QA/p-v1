import { Group, Badge, Text } from '@mantine/core'
import type { TestSummary } from '../utility/models/model'

interface TestSummaryBadgesProps {
  summary: TestSummary
  /** Compact mode for the sidebar rollups (smaller, no labels). */
  compact?: boolean
}

/**
 * The pass / fail / pending tally shown both as per-story rollups in the sidebar
 * and as the per-story / phase-level summary bar in the main panel (§9.2). Single
 * source so the colours and ordering stay identical everywhere.
 */
export function TestSummaryBadges({ summary, compact = false }: TestSummaryBadgesProps) {
  if (summary.total === 0) {
    return (
      <Text size="xs" c="dimmed" ff="monospace">
        {compact ? '0' : 'No tests'}
      </Text>
    )
  }

  const size = compact ? 'xs' : 'sm'
  return (
    <Group gap={compact ? 4 : 'xs'} wrap="nowrap">
      <Badge size={size} color="teal" variant="light" radius="sm" ff="monospace">
        {compact ? summary.pass : `${summary.pass} pass`}
      </Badge>
      <Badge size={size} color="red" variant={summary.fail > 0 ? 'light' : 'default'} radius="sm" ff="monospace">
        {compact ? summary.fail : `${summary.fail} fail`}
      </Badge>
      <Badge size={size} color="gray" variant="default" radius="sm" ff="monospace">
        {compact ? summary.pending : `${summary.pending} pending`}
      </Badge>
    </Group>
  )
}
