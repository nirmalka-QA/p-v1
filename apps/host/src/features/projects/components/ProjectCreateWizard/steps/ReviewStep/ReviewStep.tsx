import { Stack, Paper, Group, Avatar, Box, Text, Badge, Divider } from '@mantine/core'
import { projectInitials, PROJECT_TYPE_LABEL, buildProjectPhases } from '@wispr/projects'
import type {
  IProjectTypeCatalogEntry,
  IStrategyPhase,
  ProjectType,
  ProjectWizardValues,
} from '@wispr/projects'
import { PROJECT_TYPE_META } from '../../../../utility/constants/constants'

interface ReviewStepProps {
  values: ProjectWizardValues
  workspaceName: string
  entry: IProjectTypeCatalogEntry | undefined
  /** The chosen "By category" solution name, if the type was picked that way. */
  solution: string | null
  /** Configured strategy phases (ordered ids), empty for non-strategy projects. */
  phaseIds: string[]
  /** The strategy phase library (resolves phase ids → names). */
  phases: IStrategyPhase[]
  /** The chosen strategy template name, or null for a custom phase set. */
  strategyTypeName: string | null
}

/** Wizard step — confirm the details before creating. */
export function ReviewStep({
  values,
  workspaceName,
  entry,
  solution,
  phaseIds,
  phases,
  strategyTypeName,
}: ReviewStepProps) {
  const meta = entry ? PROJECT_TYPE_META[entry.key] : undefined
  const industryLabel = values.industry
    ? PROJECT_TYPE_LABEL[values.industry as ProjectType]
    : null
  const configuredPhases = phaseIds.length ? buildProjectPhases(phaseIds, phases) : []

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group gap="md" wrap="nowrap">
          {values.logo ? (
            <Avatar src={values.logo} radius="md" size={48} />
          ) : (
            <Avatar radius="md" size={48} color={meta?.colorSeed ?? 'indigo'}>
              {projectInitials(values.name || 'New Project')}
            </Avatar>
          )}
          <Box miw={0}>
            <Text fw={600}>{values.name}</Text>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {values.description}
            </Text>
          </Box>
        </Group>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
          Setup
        </Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Workspace
            </Text>
            <Text size="sm" fw={500}>
              {workspaceName}
            </Text>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Project type
            </Text>
            {entry ? (
              <Group gap="xs" wrap="nowrap">
                {solution ? (
                  <Text size="sm" fw={500}>
                    {solution}
                  </Text>
                ) : null}
                <Badge variant="light" color={meta?.colorSeed ?? 'indigo'} radius="sm">
                  {entry.name}
                </Badge>
              </Group>
            ) : (
              <Text size="sm">—</Text>
            )}
          </Group>
          {industryLabel ? (
            <>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Industry
                </Text>
                <Text size="sm" fw={500}>
                  {industryLabel}
                </Text>
              </Group>
            </>
          ) : null}
        </Stack>
      </Paper>

      {configuredPhases.length > 0 ? (
        <Paper withBorder radius="md" p="md">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="sm">
            Phases · {strategyTypeName ?? 'Custom'} ({configuredPhases.length})
          </Text>
          <Group gap={6}>
            {configuredPhases.map((phase, i) => (
              <Badge
                key={phase.id}
                variant={phase.mandatory ? 'filled' : 'light'}
                color={phase.mandatory ? 'pink' : 'gray'}
                radius="sm"
              >
                {i + 1}. {phase.name}
              </Badge>
            ))}
          </Group>
        </Paper>
      ) : null}
    </Stack>
  )
}
