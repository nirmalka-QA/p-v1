import { Badge, Box, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import styles from './ComingSoon.module.css'

interface ComingSoonProps {
  label?: string
  children?: ReactNode
  inline?: boolean
}

export function ComingSoon({ label = 'Coming Soon', children, inline = false }: ComingSoonProps) {
  if (inline) {
    return (
      <Badge size="xs" color="gray" variant="light" radius="sm">
        {label}
      </Badge>
    )
  }

  return (
    <Box p="xl" className={styles.comingSoon ?? ''}>
      <Stack align="center" gap="sm">
        <Badge color="gray" variant="light">
          {label}
        </Badge>
        {children && (
          <Text size="sm" c="dimmed" ta="center">
            {children}
          </Text>
        )}
      </Stack>
    </Box>
  )
}
