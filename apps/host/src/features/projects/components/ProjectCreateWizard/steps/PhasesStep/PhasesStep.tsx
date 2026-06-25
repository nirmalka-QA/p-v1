import { useState } from 'react'
import { Stack, Text, Group, Badge, SegmentedControl, SimpleGrid, Skeleton, Box } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import { orderPhaseIds } from '@wispr/projects'
import type { IStrategyTypeOption, IStrategyPhase } from '@wispr/projects'
import { StrategyTypeCard } from '../../components/StrategyTypeCard/StrategyTypeCard'
import { PhaseEditor } from '../../components/PhaseEditor/PhaseEditor'

interface PhaseSelection {
  strategyType: string
  phaseIds: string[]
}

interface PhasesStepProps {
  strategyTypes: IStrategyTypeOption[]
  phases: IStrategyPhase[]
  isLoading: boolean
  isError: boolean
  refetch: () => void
  strategyType: string
  phaseIds: string[]
  onChange: (selection: PhaseSelection) => void
}

type PhaseMode = 'template' | 'custom'

/**
 * Wizard step (strategy only) — configure the project's phases. "By strategy type"
 * picks a template that maps to predefined phases; "Build your own" edits the phase
 * set directly. Discovery + Executive Sign-off are always included. The resulting
 * ordered phase ids (+ template key) are persisted on the project and drive the
 * strategy remote's phase rail.
 */
export function PhasesStep({
  strategyTypes,
  phases,
  isLoading,
  isError,
  refetch,
  strategyType,
  phaseIds,
  onChange,
}: PhasesStepProps) {
  // Default the mode from the current selection (template if a type is chosen).
  const [mode, setMode] = useState<PhaseMode>(strategyType || !phaseIds.length ? 'template' : 'custom')

  const byId = new Map(phases.map((p) => [p.id, p]))
  const mandatoryIds = phases.filter((p) => p.mandatory).map((p) => p.id)

  function switchMode(next: PhaseMode) {
    setMode(next)
    if (next === 'custom') {
      // Seed custom editing from the current phases, or the mandatory pair if none yet.
      const seed = phaseIds.length ? phaseIds : mandatoryIds
      onChange({ strategyType: '', phaseIds: orderPhaseIds(seed) })
    }
  }

  function selectTemplate(type: IStrategyTypeOption) {
    // Use the template's phases EXACTLY as the backend defines them (order + bookends included).
    // No client-side reordering/pinning — the backend strategy schema is the single source of truth.
    onChange({ strategyType: type.key, phaseIds: type.phaseIds })
  }

  function editCustom(nextPhaseIds: string[]) {
    onChange({ strategyType: '', phaseIds: nextPhaseIds })
  }

  const previewChips = phaseIds
    .map((id) => byId.get(id))
    .filter((p): p is IStrategyPhase => Boolean(p))

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Strategy projects are phase-driven. Pick a strategy type or build your own set.{' '}
        <Text span fw={600} c="dimmed">
          Discovery
        </Text>{' '}
        and{' '}
        <Text span fw={600} c="dimmed">
          Executive Sign-off
        </Text>{' '}
        are always included.
      </Text>

      <SegmentedControl
        value={mode}
        onChange={(v) => switchMode(v as PhaseMode)}
        data={[
          { value: 'template', label: 'By strategy type' },
          { value: 'custom', label: 'Build your own' },
        ]}
        size="xs"
        w="fit-content"
      />

      {isLoading && (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={108} radius="md" />
          ))}
        </SimpleGrid>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load strategy types"
          description="Something went wrong while loading the strategy templates. Please try again."
          action={{ label: 'Retry', onClick: refetch }}
        />
      )}

      {!isLoading && !isError && mode === 'template' && (
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          {strategyTypes.map((type) => (
            <StrategyTypeCard
              key={type.key}
              name={type.name}
              description={type.description}
              phaseCount={type.phaseIds.length}
              selected={strategyType === type.key}
              onSelect={() => selectTemplate(type)}
            />
          ))}
        </SimpleGrid>
      )}

      {!isLoading && !isError && mode === 'custom' && (
        <PhaseEditor phases={phases} phaseIds={phaseIds} onChange={editCustom} />
      )}

      {previewChips.length > 0 ? (
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Phases in this project
          </Text>
          <Group gap={6}>
            {previewChips.map((phase, i) => (
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
        </Box>
      ) : null}
    </Stack>
  )
}
