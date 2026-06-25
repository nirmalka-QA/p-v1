import { Group, Title, Text, Box } from '@mantine/core'
import type { ReactNode } from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: string
  /** Secondary row under the title — badges, counts, timestamps, etc. */
  meta?: ReactNode
  /** Right-aligned actions (buttons). */
  actions?: ReactNode
  /** Inline node beside the title (e.g. a status badge). */
  badge?: ReactNode
}

/**
 * The single page header used by every phase: title (+ optional badge / meta /
 * actions) above a hairline divider. Compose the slots instead of hand-rolling a
 * header per page.
 */
export function PageHeader({ title, description, meta, actions, badge }: PageHeaderProps) {
  return (
    <Box className={styles.header ?? ''}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box miw={0}>
          <Group gap="sm" align="center" mb={description ? 4 : 0}>
            <Title order={2} size="h2">
              {title}
            </Title>
            {badge}
          </Group>
          {description && (
            <Text size="sm" c="dimmed" maw={560} lh={1.6}>
              {description}
            </Text>
          )}
          {meta && <Box className={styles.meta ?? ''}>{meta}</Box>}
        </Box>
        {actions && (
          <Group gap="sm" wrap="nowrap">
            {actions}
          </Group>
        )}
      </Group>
    </Box>
  )
}
