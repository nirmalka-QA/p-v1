import { useNavigate } from 'react-router-dom'
import {
  Box,
  Group,
  Stack,
  Title,
  Text,
  Select,
  Paper,
  Table,
  Avatar,
  Badge,
  Progress,
  Skeleton,
} from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { ROUTES } from '@wispr/contracts'
import {
  PROJECT_STATUS_LABEL,
  ProjectStatus,
  projectColor,
  projectInitials,
} from '@wispr/projects'
import type { Project } from '@wispr/projects'
import { projectTypeTag, projectTypeColor } from '../../../projects/utility/constants/constants'
import { KpiRow } from '../../../global-dashboard/components/KpiRow/KpiRow'
import { TypeBars } from '../../../global-dashboard/components/TypeBars/TypeBars'
import { useWorkspaceDashboard } from '../../utility/hooks/useWorkspaceDashboard'
import type { ProjectHealth } from '../../utility/helpers/helpers'
import type { Workspace } from '../../utility/models/model'
import styles from './WorkspaceDashboardView.module.css'

interface WorkspaceDashboardViewProps {
  workspace: Workspace
}

/** Representative completion per status (projects carry no phase index in the host). */
const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  [ProjectStatus.NEW]: 20,
  [ProjectStatus.IN_PROGRESS]: 60,
  [ProjectStatus.COMPLETED]: 100,
}

const HEALTH_META: Record<ProjectHealth, { label: string; color: string }> = {
  onTrack: { label: 'On track', color: 'teal' },
  atRisk: { label: 'At risk', color: 'orange' },
  onHold: { label: 'On hold', color: 'gray' },
}

/**
 * The workspace dashboard tab (`?view=dashboard`) — per-workspace KPIs, a project
 * status table, and projects-by-type bars. The "View as" select simulates a member's
 * visibility (owners/admins see all; members/viewers see assigned projects only).
 */
export function WorkspaceDashboardView({ workspace }: WorkspaceDashboardViewProps) {
  const navigate = useNavigate()
  const {
    viewAs,
    setViewAs,
    viewAsOptions,
    seesAll,
    viewAsRoleLabel,
    rows,
    projectCount,
    onTrack,
    atRisk,
    peopleCount,
    byType,
    isFetching,
    isError,
    refetch,
  } = useWorkspaceDashboard(workspace)

  const viewAsName = viewAsOptions.find((o) => o.value === viewAs)?.label.split(' — ')[0] ?? 'member'
  const scope = seesAll
    ? `Showing all ${projectCount} project${projectCount !== 1 ? 's' : ''} — ${viewAsName} is ${viewAsRoleLabel} of this workspace.`
    : `Showing ${projectCount} project${projectCount !== 1 ? 's' : ''} assigned to ${viewAsName} (${viewAsRoleLabel}). Owners and admins see every project.`

  function openProject(project: Project) {
    navigate(ROUTES.discovery(project.id))
  }

  if (isFetching) {
    return (
      <Stack gap="md">
        <Skeleton height={56} radius="md" />
        <Skeleton height={92} radius="md" />
        <Skeleton height={220} radius="md" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load the dashboard"
        description="Something went wrong while loading this workspace's projects. Please try again."
        action={{ label: 'Retry', onClick: () => refetch() }}
      />
    )
  }

  return (
    <Stack gap="lg">
      <Group gap="sm" align="center" wrap="wrap">
        <Text size="sm" fw={600}>
          Viewing as
        </Text>
        <Select
          data={viewAsOptions}
          value={viewAs}
          onChange={(v) => v && setViewAs(v)}
          allowDeselect={false}
          w={260}
        />
        <Text size="sm" c="dimmed">
          {scope}
        </Text>
      </Group>

      <KpiRow
        items={[
          { label: 'Projects', value: projectCount, sub: seesAll ? 'all in workspace' : 'assigned' },
          { label: 'On track', value: onTrack },
          { label: 'At risk', value: atRisk },
          { label: 'People', value: peopleCount },
        ]}
      />

      <Paper withBorder radius="md" p="lg">
        <Text fw={700} size="sm" mb="md">
          Project status
        </Text>
        {rows.length === 0 ? (
          <Text size="sm" c="dimmed" py="md">
            No projects assigned to {viewAsName} in this workspace.
          </Text>
        ) : (
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Project</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Phase</Table.Th>
                <Table.Th>Progress</Table.Th>
                <Table.Th>Health</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map(({ project, health }) => {
                const meta = HEALTH_META[health]
                return (
                  <Table.Tr
                    key={project.id}
                    onClick={() => openProject(project)}
                    className={styles.clickRow ?? ''}
                  >
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar color={projectColor(project.id)} variant="filled" radius="sm" size={28} fz={10} fw={700}>
                          {projectInitials(project.name)}
                        </Avatar>
                        <Text size="sm" fw={600} truncate>
                          {project.name}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={projectTypeColor(project.projectType)} radius="sm">
                        {projectTypeTag(project.projectType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{PROJECT_STATUS_LABEL[project.status] ?? 'New'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Progress value={STATUS_PROGRESS[project.status] ?? 0} w={90} size="sm" radius="sm" />
                        <Text size="xs" c="dimmed" ff="monospace">
                          {STATUS_PROGRESS[project.status] ?? 0}%
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={meta.color} radius="sm">
                        {meta.label}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {byType.length > 0 ? (
        <Paper withBorder radius="md" p="lg">
          <Text fw={700} size="sm" mb="md">
            Projects by type
          </Text>
          <TypeBars rows={byType} />
        </Paper>
      ) : null}
    </Stack>
  )
}
