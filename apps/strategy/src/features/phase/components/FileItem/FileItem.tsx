import type { ReactNode } from 'react'
import { Group, Box, Text } from '@mantine/core'
import { IconFile, IconFileExport } from '@tabler/icons-react'
import { ActionMenu } from '../../../../components/ui/ActionMenu/ActionMenu'
import type { MenuAction } from '../../../../components/ui/ActionMenu/ActionMenu'
import styles from './FileItem.module.css'

interface FileItemProps {
  name: string
  /** Secondary line — e.g. "PDF · 240 KB" or "Standard Template · Generated …". */
  meta: string
  /** Violet file tile for AI outputs. */
  accent?: boolean
  /** Overflow (⋯) menu actions — download / delete / edit context / … */
  actions?: MenuAction[]
  /** An explicit right-side control instead of the menu (e.g. a Generate button). */
  action?: ReactNode
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

/**
 * A single file row: a file tile, the name, and a "TYPE · SIZE" (or generated) metadata
 * line, with either an explicit right-side control or a shared ⋯ overflow menu. The
 * building block of the phase document sections — consistent for inputs, additional docs,
 * and outputs.
 */
export function FileItem({ name, meta, accent, actions, action }: FileItemProps) {
  return (
    <Group justify="space-between" wrap="nowrap" align="center" gap="sm" className={styles.chip ?? ''}>
      <Group gap="sm" wrap="nowrap" align="center" miw={0} flex={1}>
        <Box className={cx(styles.tile, accent && styles.tileAccent)}>
          {accent ? <IconFileExport size={15} /> : <IconFile size={15} />}
        </Box>
        <Box miw={0}>
          <Text className={styles.name ?? ''}>{name}</Text>
          <Text className={styles.meta ?? ''}>{meta}</Text>
        </Box>
      </Group>

      {action ? action : actions && actions.length > 0 ? <ActionMenu actions={actions} /> : null}
    </Group>
  )
}
