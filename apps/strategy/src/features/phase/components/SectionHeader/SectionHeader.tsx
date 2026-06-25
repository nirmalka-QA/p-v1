import type { ReactNode } from 'react'
import { Box, Group, Text, Divider } from '@mantine/core'

interface SectionHeaderProps {
  title: string
  hint: string
  /** Optional right-aligned action (e.g. the "Upload document" button). */
  right?: ReactNode
  /** Render a full-width divider above — used to clearly separate stacked sections. */
  topDivider?: boolean
}

/**
 * A sub-section header inside a document column (Mandatory / Additional / Outputs) — a
 * title + one-line hint (a smaller echo of the column header), an optional trailing
 * action, and an optional top divider that clearly separates one section from the next.
 */
export function SectionHeader({ title, hint, right, topDivider }: SectionHeaderProps) {
  return (
    <Box>
      {topDivider ? <Divider mt="xl" mb="lg" /> : null}
      <Group justify="space-between" align="flex-end" wrap="nowrap" gap="sm" mt={topDivider ? 0 : 'lg'} mb="sm">
        <Box miw={0}>
          <Text fz={13} fw={600}>
            {title}
          </Text>
          <Text fz={11} c="dimmed">
            {hint}
          </Text>
        </Box>
        {right}
      </Group>
    </Box>
  )
}
