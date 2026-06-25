import { useMemo, useState } from 'react'
import {
  Paper,
  Stack,
  Group,
  Text,
  SegmentedControl,
  SimpleGrid,
  Card,
  Avatar,
  Divider,
  Badge,
  Skeleton,
} from '@mantine/core'
import { IconAlertTriangle, IconFolderOff, IconFolder } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { projectColor, projectInitials } from '@wispr/projects'
import { useGetProfileProjectsQuery } from '../../utility/services/services'
import { formatMonthYear } from '../../utility/helpers/helpers'
import {
  PROFILE_PROJECT_STATUS_LABEL,
  PROFILE_PROJECT_STATUS_COLOR,
  type ProfileProjectFilter,
} from '../../utility/constants/constants'
import type { ProfileProject } from '../../utility/models/model'
import styles from './ProjectsSection.module.css'

/** One project rendered as a card: identity + status, then role / started meta. */
function ProjectCard({ project }: { project: ProfileProject }) {
  return (
    <Card withBorder radius="md" padding="lg" className={styles.card ?? ''}>
      <Group justify="space-between" align="flex-start" wrap="nowrap" mb="sm">
        <Group gap="sm" wrap="nowrap" miw={0}>
          <Avatar color={projectColor(project.id)} radius="md" size={40}>
            {projectInitials(project.name)}
          </Avatar>
          <Stack gap={2} miw={0}>
            <Text fw={600} size="sm" truncate>
              {project.name}
            </Text>
            <Group gap={5} wrap="nowrap" c="dimmed">
              <IconFolder size={13} />
              <Text size="xs" c="dimmed" truncate>
                {project.workspaceName}
              </Text>
            </Group>
          </Stack>
        </Group>
        <Badge color={PROFILE_PROJECT_STATUS_COLOR[project.status]} variant="light">
          {PROFILE_PROJECT_STATUS_LABEL[project.status]}
        </Badge>
      </Group>

      <Divider my="sm" />

      <SimpleGrid cols={2} spacing="xs">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.4}>
            Your role
          </Text>
          <Text size="sm" fw={500}>
            {project.projectRole}
          </Text>
        </Stack>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.4}>
            Started
          </Text>
          <Text size="sm" fw={500}>
            {formatMonthYear(project.startedDate)}
          </Text>
        </Stack>
      </SimpleGrid>
    </Card>
  )
}

/**
 * The project-history card grid: every project the user has worked on, filterable
 * by Active / Closed (the user's involvement status). Owns its own loading / error /
 * empty states; counts come from the response so they're stable across filtering.
 */
export function ProjectsSection() {
  const { data, isLoading, isError, refetch } = useGetProfileProjectsQuery()
  const [filter, setFilter] = useState<ProfileProjectFilter>('all')

  const projects = useMemo(() => {
    const all = data?.projects ?? []
    if (filter === 'all') return all
    return all.filter((p) => p.status === filter)
  }, [data, filter])

  if (isLoading) {
    return (
      <Paper withBorder radius="md" p="lg">
        <Skeleton height={28} width={220} radius="sm" mb="md" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
          <Skeleton height={132} radius="md" />
        </SimpleGrid>
      </Paper>
    )
  }

  if (isError || !data) {
    return (
      <Paper withBorder radius="md" p="lg">
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load your projects"
          description="Something went wrong while fetching your project history. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </Paper>
    )
  }

  return (
    <Paper withBorder radius="md" p="lg">
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Text fw={700} size="sm">
          Projects
        </Text>
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={(value) => setFilter(value as ProfileProjectFilter)}
          data={[
            { label: `All ${data.totalCount}`, value: 'all' },
            { label: `Active ${data.activeCount}`, value: 'active' },
            { label: `Closed ${data.closedCount}`, value: 'closed' },
          ]}
        />
      </Group>

      {data.totalCount === 0 ? (
        <EmptyState
          icon={IconFolder}
          title="No projects yet"
          description="Projects you're added to will appear here with their status."
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={IconFolderOff}
          title={`No ${PROFILE_PROJECT_STATUS_LABEL[filter as 'active' | 'closed'].toLowerCase()} projects`}
          description="Try a different filter to see the rest of your project history."
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </SimpleGrid>
      )}
    </Paper>
  )
}
