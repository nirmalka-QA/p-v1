import { Group, Text, ThemeIcon } from '@mantine/core'
import { IconCircleCheck, IconGitBranch } from '@tabler/icons-react'
import { useGetSetupStateQuery, useGetRepoQuery } from '../utility/services/implementationApi'

interface ScaffoldReadyBarProps {
  projectId: string
}

/**
 * Compact orientation strip shown once the project is scaffolded — tells the
 * developer setup is done and where the code lives, so the board doesn't feel
 * like an unexplained list after the wizard. Renders nothing until 'ready'
 * (the red ScaffoldNotice covers the not-ready states).
 */
export function ScaffoldReadyBar({ projectId }: ScaffoldReadyBarProps) {
  const { data: setup } = useGetSetupStateQuery(projectId)
  const { data: repo } = useGetRepoQuery(projectId)

  if (setup?.scaffoldStatus !== 'ready') return null

  const branch = setup.scaffoldBranch || repo?.branch || '-'
  const repoLabel = repo ? `${repo.organisation ? `${repo.organisation}/` : ''}${repo.repoName}` : null

  return (
    <Group gap="xs" wrap="nowrap" mb="md">
      <ThemeIcon size={18} radius="xl" color="teal" variant="light">
        <IconCircleCheck size={12} />
      </ThemeIcon>
      <Text size="xs" c="dimmed">
        Scaffolded
      </Text>
      <Group gap={4} wrap="nowrap" c="dimmed">
        <IconGitBranch size={12} />
        <Text size="xs" ff="monospace">
          {branch}
        </Text>
      </Group>
      {repoLabel && (
        <Text size="xs" c="dimmed" ff="monospace" truncate>
          · {repoLabel}
        </Text>
      )}
    </Group>
  )
}
