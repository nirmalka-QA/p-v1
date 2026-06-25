import { Box, Group, Text, List, ThemeIcon } from '@mantine/core'
import type { ComponentType } from 'react'

interface RequirementListProps {
  title: string
  icon: ComponentType<{ size?: number; stroke?: number }>
  items: string[]
  /** Mantine colour for the section icon (e.g. 'indigo' for functional). */
  color: string
  /** Message shown when no requirements have been captured for this group. */
  emptyText: string
}

/**
 * Titled, scannable requirement list — reused for both functional and
 * non-functional requirements on a feature. Presentational only.
 */
export function RequirementList({
  title,
  icon: Icon,
  items,
  color,
  emptyText,
}: RequirementListProps) {
  return (
    <Box>
      <Group gap="xs" mb="sm">
        <ThemeIcon size={22} radius="sm" variant="light" color={color}>
          <Icon size={13} />
        </ThemeIcon>
        <Text fw={600} size="sm">
          {title}
        </Text>
        <Text size="xs" c="dimmed" ff="monospace">
          {items.length}
        </Text>
      </Group>

      {items.length > 0 ? (
        <List spacing="xs" size="sm" c="dimmed" withPadding>
          {items.map((item, i) => (
            <List.Item key={i}>{item}</List.Item>
          ))}
        </List>
      ) : (
        <Text size="sm" c="dimmed" pl="xs">
          {emptyText}
        </Text>
      )}
    </Box>
  )
}
