import { useState } from 'react'
import {
  Stack,
  Text,
  Group,
  Box,
  ThemeIcon,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
} from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import type { ProjectType } from '@wispr/contracts'
import type { IProjectTypeCatalogEntry } from '@wispr/projects'
import { SOLUTION_CATS, solutionId } from '../../../../utility/constants/constants'
import { ProjectTypeCard } from '../../components/ProjectTypeCard/ProjectTypeCard'

interface ProjectTypeStepProps {
  catalog: IProjectTypeCatalogEntry[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
  /** The selected federation type key (drives All-types highlight + the Next gate). */
  selectedType: string
  /** The selected solution id (category mode highlight), or null in All-types mode. */
  selectedSolutionId: string | null
  onSelectType: (key: ProjectType) => void
  onSelectSolution: (id: string, maps: ProjectType, name: string) => void
}

type PickerMode = 'all' | 'category'

/**
 * Wizard step ② — pick the project type. Two modes (the prototype's toggle): "All
 * types" lists the seven federation types straight from the catalog; "By category"
 * groups ready-made solutions that each map down to one of those types. Coming-soon
 * types/solutions are non-selectable.
 */
export function ProjectTypeStep({
  catalog,
  isLoading,
  isError,
  refetch,
  selectedType,
  selectedSolutionId,
  onSelectType,
  onSelectSolution,
}: ProjectTypeStepProps) {
  const [mode, setMode] = useState<PickerMode>('all')
  const statusByKey = new Map(catalog.map((e) => [e.key, e.status]))

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Select the one type that best fits this project. It shapes the phases and AI context across
        the whole project.
      </Text>

      {isLoading && (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={132} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load project types"
          description="Something went wrong while loading the available project types. Please try again."
          action={{ label: 'Retry', onClick: refetch }}
        />
      )}

      {!isLoading && !isError && (
        <>
          <SegmentedControl
            value={mode}
            onChange={(v) => setMode(v as PickerMode)}
            data={[
              { value: 'all', label: 'All types' },
              { value: 'category', label: 'By category' },
            ]}
            size="xs"
            w="fit-content"
          />

          {mode === 'all' && (
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
              {catalog.map((entry) => (
                <ProjectTypeCard
                  key={entry.key}
                  typeKey={entry.key}
                  name={entry.name}
                  description={entry.description}
                  comingSoon={entry.status === 'coming-soon'}
                  selected={selectedSolutionId === null && selectedType === entry.key}
                  onSelect={() => onSelectType(entry.key)}
                />
              ))}
            </SimpleGrid>
          )}

          {mode === 'category' &&
            SOLUTION_CATS.map((cat) => (
              <Box key={cat.key}>
                <Group gap="sm" align="center" mb="xs">
                  <ThemeIcon size={30} radius="md" variant="light" color={cat.colorSeed}>
                    <cat.icon size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {cat.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {cat.description}
                  </Text>
                </Group>
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
                  {cat.solutions.map((sol, i) => {
                    const id = solutionId(cat.key, i)
                    return (
                      <ProjectTypeCard
                        key={id}
                        typeKey={sol.maps}
                        name={sol.name}
                        description={sol.description}
                        comingSoon={statusByKey.get(sol.maps) === 'coming-soon'}
                        selected={selectedSolutionId === id}
                        onSelect={() => onSelectSolution(id, sol.maps, sol.name)}
                      />
                    )
                  })}
                </SimpleGrid>
              </Box>
            ))}
        </>
      )}
    </Stack>
  )
}
