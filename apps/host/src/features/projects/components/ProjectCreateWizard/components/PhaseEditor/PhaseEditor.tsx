import { Stack, Group, Box, Text, Badge, ActionIcon, Button, Paper, Tooltip } from '@mantine/core'
import { IconChevronUp, IconChevronDown, IconX, IconPlus } from '@tabler/icons-react'
import { orderPhaseIds } from '@wispr/projects'
import type { IStrategyPhase } from '@wispr/projects'

interface PhaseEditorProps {
  /** The phase library (all available phases). */
  phases: IStrategyPhase[]
  /** Currently included phase ids, in order (Discovery first, Sign-off last). */
  phaseIds: string[]
  onChange: (phaseIds: string[]) => void
}

/**
 * Build-your-own strategy phase editor (prototype `phaseCustomHTML`): reorder and
 * remove the included phases and add from the remaining library. Discovery and
 * Executive Sign-off are mandatory — always included, locked, and pinned to the ends.
 */
export function PhaseEditor({ phases, phaseIds, onChange }: PhaseEditorProps) {
  const byId = new Map(phases.map((p) => [p.id, p]))
  const included = phaseIds.map((id) => byId.get(id)).filter((p): p is IStrategyPhase => Boolean(p))
  const available = phases.filter((p) => !phaseIds.includes(p.id))

  // The reorderable middle (everything except the pinned mandatory phases).
  const middle = phaseIds.filter((id) => !byId.get(id)?.mandatory)

  function move(id: string, dir: -1 | 1) {
    const i = middle.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= middle.length) return
    const next = [...middle]
    ;[next[i], next[j]] = [next[j] as string, next[i] as string]
    onChange(orderPhaseIds(next))
  }

  function remove(id: string) {
    onChange(orderPhaseIds(middle.filter((x) => x !== id)))
  }

  function add(id: string) {
    onChange(orderPhaseIds([...middle, id]))
  }

  return (
    <Stack gap="md">
      <Stack gap="xs">
        {included.map((phase) => {
          const pos = middle.indexOf(phase.id)
          return (
            <Paper key={phase.id} withBorder radius="md" p="sm">
              <Group justify="space-between" wrap="nowrap" gap="sm">
                <Box miw={0}>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" fw={600} truncate>
                      {phase.name}
                    </Text>
                    {phase.mandatory ? (
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        Required
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {phase.description}
                  </Text>
                </Box>
                {phase.mandatory ? (
                  <Tooltip label="Always included" withinPortal>
                    <Text size="xs" c="dimmed" fw={600} flex="0 0 auto">
                      Locked
                    </Text>
                  </Tooltip>
                ) : (
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Move ${phase.name} up`}
                      disabled={pos <= 0}
                      onClick={() => move(phase.id, -1)}
                    >
                      <IconChevronUp size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={`Move ${phase.name} down`}
                      disabled={pos < 0 || pos >= middle.length - 1}
                      onClick={() => move(phase.id, 1)}
                    >
                      <IconChevronDown size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      aria-label={`Remove ${phase.name}`}
                      onClick={() => remove(phase.id)}
                    >
                      <IconX size={15} />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
            </Paper>
          )
        })}
      </Stack>

      {available.length > 0 ? (
        <Box>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Add phases
          </Text>
          <Stack gap="xs">
            {available.map((phase) => (
              <Group key={phase.id} justify="space-between" wrap="nowrap" gap="sm">
                <Box miw={0}>
                  <Text size="sm" fw={500} truncate>
                    {phase.name}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {phase.description}
                  </Text>
                </Box>
                <Button
                  variant="subtle"
                  size="compact-sm"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => add(phase.id)}
                >
                  Add
                </Button>
              </Group>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  )
}
