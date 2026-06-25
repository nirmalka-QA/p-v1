import type { ReactNode } from 'react'
import { Box, Group, Text } from '@mantine/core'
import styles from './DocBox.module.css'

interface DocBoxProps {
  /** A document-group title (a mandatory requirement); omitted for the Additional tray. */
  title?: string
  /** Header actions (Upload, context toggle) aligned to the right of the title. */
  action?: ReactNode
  /** The tray body — file chips or an empty hint. */
  children: ReactNode
}

/**
 * A grouping tray for a document title and the files inside it. Used for each mandatory
 * requirement and for the Additional documents set, so both read consistently.
 */
export function DocBox({ title, action, children }: DocBoxProps) {
  const hasHead = Boolean(title) || Boolean(action)
  return (
    <Box className={styles.box ?? ''}>
      {hasHead ? (
        <Group justify={title ? 'space-between' : 'flex-end'} align="center" wrap="nowrap" gap="sm" className={styles.head ?? ''}>
          {title ? <Text className={styles.title ?? ''}>{title}</Text> : null}
          {action}
        </Group>
      ) : null}
      {children}
    </Box>
  )
}
