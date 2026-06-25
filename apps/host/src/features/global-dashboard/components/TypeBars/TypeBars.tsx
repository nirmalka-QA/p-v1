import { Stack, Group, Text, Progress } from '@mantine/core'

/** Minimal shape a bar needs — `type` is only a stable React key, so any project-type
 *  string (federation or industry) works. Both dashboards feed this component. */
export interface TypeBarRow {
  type: string
  label: string
  count: number
}

interface TypeBarsProps {
  rows: TypeBarRow[]
}

/** Horizontal bar list of project counts by type. */
export function TypeBars({ rows }: TypeBarsProps) {
  if (!rows.length) {
    return (
      <Text size="sm" c="dimmed">
        No projects yet.
      </Text>
    )
  }
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Stack gap="sm">
      {rows.map((r) => (
        <Group key={r.type} gap="md" wrap="nowrap">
          <Text size="sm" w={120} truncate>
            {r.label}
          </Text>
          <Progress value={(r.count / max) * 100} flex={1} size="md" radius="sm" color="indigo" />
          <Text size="sm" fw={700} ff="monospace" w={24} ta="right">
            {r.count}
          </Text>
        </Group>
      ))}
    </Stack>
  )
}
