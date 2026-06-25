import { Badge } from '@mantine/core'
import type { StoryStatus, TestStatus } from '../../types'

type Status = StoryStatus | TestStatus

const STATUS_MAP: Record<Status, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  ready: { label: 'Ready for Dev', color: 'teal' },
  'in-progress': { label: 'In Progress', color: 'blue' },
  done: { label: 'Done', color: 'violet' },
  closed: { label: 'Closed', color: 'dark' },
  pending: { label: 'Pending', color: 'gray' },
  pass: { label: 'Pass', color: 'teal' },
  fail: { label: 'Fail', color: 'red' },
}

interface StatusBadgeProps {
  status: Status
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_MAP[status]
  return (
    <Badge size={size} color={config.color} variant="light" radius="sm">
      {config.label}
    </Badge>
  )
}
