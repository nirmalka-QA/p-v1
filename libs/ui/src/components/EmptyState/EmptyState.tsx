import { Stack, ThemeIcon, Title, Text, Button, Box } from '@mantine/core'
import type { ComponentType, ReactNode } from 'react'

interface EmptyStateProps {
  icon: ComponentType<{ size?: number; stroke?: number }>
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, children }: EmptyStateProps) {
  return (
    <Box py={64}>
      <Stack align="center" gap="md">
        <ThemeIcon size={56} radius="xl" variant="light" color="gray">
          <Icon size={26} stroke={1.5} />
        </ThemeIcon>
        <Stack align="center" gap={6}>
          <Title order={4} ta="center" fw={600}>
            {title}
          </Title>
          <Text size="sm" c="dimmed" ta="center" maw={400} lh={1.6}>
            {description}
          </Text>
        </Stack>
        {action && (
          <Button variant="light" onClick={action.onClick} mt={4}>
            {action.label}
          </Button>
        )}
        {children}
      </Stack>
    </Box>
  )
}
