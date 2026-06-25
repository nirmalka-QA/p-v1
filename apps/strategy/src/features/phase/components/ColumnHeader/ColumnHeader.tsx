import { Box, Title, Text, Divider } from '@mantine/core'

interface ColumnHeaderProps {
  title: string
  description: string
}

/**
 * A phase document column header in the app's modal-header language — a 16px/600 title
 * with a 12px muted description, then a hairline divider. Shared so Input / Output read
 * identically.
 */
export function ColumnHeader({ title, description }: ColumnHeaderProps) {
  return (
    <Box>
      <Title order={3} fz={16} fw={600} lts="-0.015em">
        {title}
      </Title>
      <Text fz={12} c="dimmed" mt={2}>
        {description}
      </Text>
      <Divider mt="md" />
    </Box>
  )
}
