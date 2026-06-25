import { Stack, Group, Box, Text } from '@mantine/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { projectTypeColor } from '../../../projects/utility/constants/constants'
import type { DashboardActivity } from '../../utility/models/model'
import styles from './RecentActivity.module.css'

dayjs.extend(relativeTime)

interface RecentActivityProps {
  items: DashboardActivity[]
}

/** Most-recent project updates across all workspaces — the prototype's `.act-list`. */
export function RecentActivity({ items }: RecentActivityProps) {
  if (!items.length) {
    return (
      <Text size="sm" c="dimmed">
        No recent activity.
      </Text>
    )
  }
  return (
    <Stack gap={0}>
      {items.map((a) => (
        <Group key={a.projectId} className={styles.row ?? ''} gap="sm" wrap="nowrap" py={9}>
          <Box className={styles.dot ?? ''} bg={`${projectTypeColor(a.type)}.6`} />
          <Box flex={1} miw={0}>
            <Text size="sm" fw={600} truncate>
              {a.projectName}
              <Text span size="sm" c="dimmed" fw={400}>
                {' '}
                · {a.phase}
              </Text>
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {a.workspaceName}
            </Text>
          </Box>
          <Text size="xs" c="dimmed" ff="monospace">
            {a.updatedAt ? dayjs(a.updatedAt).fromNow() : '—'}
          </Text>
        </Group>
      ))}
    </Stack>
  )
}
