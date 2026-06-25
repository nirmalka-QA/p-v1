import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Group, Stack, Title, Text, Button, Skeleton, TextInput, Select } from '@mantine/core'
import { IconPlus, IconSearch, IconFolder, IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { ROUTES, SETTINGS_PARAM, SETTINGS_GENERAL } from '@wispr/contracts'
import type { Project } from '@wispr/projects'
import { ProjectCard } from '../../../projects/components/ProjectCard/ProjectCard'
import { ProjectCreateWizard } from '../../../projects/components/ProjectCreateWizard/ProjectCreateWizard'
import { projectTypeLabel } from '../../../projects/utility/constants/constants'
import { useWorkspaceProjects } from '../../utility/hooks/useWorkspaceProjects'
import type { Workspace } from '../../utility/models/model'

interface WorkspaceProjectsViewProps {
  workspace: Workspace
}

const ALL_TYPES = 'all'

/**
 * The project list inside a workspace — scoped to the workspace, with search and a
 * type filter. Visibility (role-aware) and fetching live in useWorkspaceProjects;
 * this component owns presentation. Reuses the shared ProjectCard + create-project
 * wizard; the created project is associated with this workspace.
 */
export function WorkspaceProjectsView({ workspace }: WorkspaceProjectsViewProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>(ALL_TYPES)
  const [createOpen, setCreateOpen] = useState(false)

  const { projects, isFetching, isError, refetch } = useWorkspaceProjects(workspace.id, workspace)

  const typeOptions = [
    { value: ALL_TYPES, label: 'All types' },
    ...[...new Set(projects.map((p) => p.projectType))].map((t) => ({
      value: t,
      label: projectTypeLabel(t),
    })),
  ]

  const q = search.trim().toLowerCase()
  const filtered = projects.filter((p) => {
    const matchesQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    const matchesType = type === ALL_TYPES || p.projectType === type
    return matchesQ && matchesType
  })

  function openProject(project: Project) {
    navigate(ROUTES.discovery(project.id))
  }

  // Open the project at Discovery with the settings drawer requested — the mounted
  // remote owns the settings modal and listens for the ?settings= param.
  function openProjectSettings(project: Project) {
    navigate(`${ROUTES.discovery(project.id)}?${SETTINGS_PARAM}=${SETTINGS_GENERAL}`)
  }

  const showList = !isFetching && !isError && filtered.length > 0
  const showNoMatch = !isFetching && !isError && projects.length > 0 && filtered.length === 0
  const showEmpty = !isFetching && !isError && projects.length === 0

  return (
    <Box>
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
        <Title order={3} size="h4">
          Projects{' '}
          <Text span c="dimmed" fw={500} fz="md">
            {projects.length}
          </Text>
        </Title>
        <Button
          leftSection={<IconPlus size={14} />}
          variant="accent"
          onClick={() => setCreateOpen(true)}
        >
          New project
        </Button>
      </Group>

      <Group mb="md" wrap="wrap" gap="sm">
        <TextInput
          flex={1}
          maw={440}
          placeholder="Search projects…"
          leftSection={<IconSearch size={15} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Select
          data={typeOptions}
          value={type}
          onChange={(v) => setType(v ?? ALL_TYPES)}
          allowDeselect={false}
          w={170}
        />
      </Group>

      {isFetching && (
        <Stack gap="xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={76} radius="md" />
          ))}
        </Stack>
      )}

      {!isFetching && isError && (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load projects"
          description="Something went wrong while fetching this workspace's projects. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      )}

      {showEmpty && (
        <EmptyState
          icon={IconFolder}
          title="No projects yet"
          description="Create the first project in this workspace. Each project runs the full SDLC pipeline from Discovery to Test."
          action={{ label: 'New project', onClick: () => setCreateOpen(true) }}
        />
      )}

      {showNoMatch && (
        <EmptyState
          icon={IconSearch}
          title="No matching projects"
          description="Try a different search term or type filter."
        />
      )}

      {showList && (
        <Stack gap="xs">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={openProject}
              onOpenSettings={openProjectSettings}
            />
          ))}
        </Stack>
      )}

      <ProjectCreateWizard
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    </Box>
  )
}
