import { SimpleGrid, Paper, Text } from '@mantine/core'

export interface Kpi {
  label: string
  value: number | string
  sub?: string
}

interface KpiRowProps {
  items: Kpi[]
}

/** A row of headline metric cards for the dashboard. */
export function KpiRow({ items }: KpiRowProps) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
      {items.map((kpi) => (
        <Paper key={kpi.label} withBorder radius="md" p="md">
          <Text fz={28} fw={800} ff="monospace" lh={1}>
            {kpi.value}
          </Text>
          <Text size="sm" fw={600} mt={8}>
            {kpi.label}
          </Text>
          {kpi.sub ? (
            <Text size="xs" c="dimmed" mt={2}>
              {kpi.sub}
            </Text>
          ) : null}
        </Paper>
      ))}
    </SimpleGrid>
  )
}
