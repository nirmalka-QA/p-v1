import { Group, Paper, Text } from '@mantine/core'
import type { DashboardHealth } from '../../utility/models/model'

interface HealthCellsProps {
  health: DashboardHealth
}

const CELLS: Array<{ key: keyof DashboardHealth; label: string; color: string }> = [
  { key: 'onTrack', label: 'On track', color: 'teal' },
  { key: 'atRisk', label: 'At risk', color: 'orange' },
  { key: 'onHold', label: 'On hold', color: 'gray' },
]

/** Three delivery-health tallies (on track / at risk / on hold). */
export function HealthCells({ health }: HealthCellsProps) {
  return (
    <Group gap="sm" grow>
      {CELLS.map((cell) => (
        <Paper key={cell.key} withBorder radius="md" p="md" ta="center">
          <Text fz={22} fw={800} ff="monospace" lh={1} c={cell.color}>
            {health[cell.key]}
          </Text>
          <Text size="xs" c="dimmed" fw={600} mt={6}>
            {cell.label}
          </Text>
        </Paper>
      ))}
    </Group>
  )
}
