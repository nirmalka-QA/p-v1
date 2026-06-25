import { Badge, Tooltip } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import {
  PRIORITY_META,
  COMPLEXITY_META,
  COMPLEXITY_HINT,
  FEATURE_STATUS_META,
} from '../utility/constants/constants'
import type { Priority, Complexity, FeatureStatus } from '../utility/models/model'

type BadgeSize = 'xs' | 'sm' | 'md'

/** Priority pill — colour/label come from the shared PRIORITY_META map. */
export function PriorityBadge({ priority, size = 'sm' }: { priority: Priority; size?: BadgeSize }) {
  const meta = PRIORITY_META[priority]
  return (
    <Tooltip label={`${meta.label} priority`}>
      <Badge size={size} color={meta.color} variant="light" radius="sm">
        {meta.label}
      </Badge>
    </Tooltip>
  )
}

/** Complexity pill — colour/label come from the shared COMPLEXITY_META map. */
export function ComplexityBadge({
  complexity,
  size = 'sm',
}: {
  complexity: Complexity
  size?: BadgeSize
}) {
  const meta = COMPLEXITY_META[complexity]
  return (
    <Tooltip label={COMPLEXITY_HINT[complexity]}>
      <Badge size={size} color={meta.color} variant="outline" radius="sm" ff="monospace">
        {meta.label}
      </Badge>
    </Tooltip>
  )
}

/** Feature workflow-status pill — colour/label from the shared FEATURE_STATUS_META map. */
export function FeatureStatusBadge({
  status,
  size = 'sm',
}: {
  status: FeatureStatus
  size?: BadgeSize
}) {
  const meta = FEATURE_STATUS_META[status]
  return (
    <Badge size={size} color={meta.color} variant="light" radius="sm">
      {meta.label}
    </Badge>
  )
}

/** Consistent "AI Generated" marker for AI-originated content (requirements §2.3). */
export function AIBadge({ size = 'xs' }: { size?: BadgeSize }) {
  return (
    <Badge
      size={size}
      color="violet"
      variant="light"
      radius="sm"
      tt="uppercase"
      leftSection={<IconSparkles size={9} />}
    >
      AI Generated
    </Badge>
  )
}
