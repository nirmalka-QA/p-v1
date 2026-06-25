import { Alert, Button, Text } from '@mantine/core'
import { IconAlertTriangle, IconSettings } from '@tabler/icons-react'
import type { ScaffoldStatus } from '../../../types'
import styles from '../utility/styles/implementation.module.css'

interface ScaffoldNoticeProps {
  status: ScaffoldStatus
  /** Reopen the setup wizard so the user can finish / retry scaffolding. */
  onComplete: () => void
}

/** Copy per scaffold state — plain language explaining what is missing and why. */
const COPY: Record<Exclude<ScaffoldStatus, 'ready'>, { color: string; title: string; message: string; action: string }> = {
  'not-started': {
    color: 'red',
    title: 'Finish setting up implementation',
    message:
      'Your repository has not been scaffolded yet. Complete the setup wizard to scaffold the project — story development stays blocked until this is done.',
    action: 'Complete setup',
  },
  'in-progress': {
    color: 'blue',
    title: 'Scaffolding in progress',
    message:
      'We are still scaffolding your project into the repository. Story development unlocks as soon as it finishes.',
    action: 'View setup',
  },
  failed: {
    color: 'red',
    title: 'Scaffolding did not complete',
    message:
      'The initial scaffold failed, so the repository is not ready. Reopen setup and run it again — check the repository connection and that the token has write access.',
    action: 'Retry setup',
  },
}

/**
 * Persistent banner shown on the Implementation section pages whenever the
 * project has not been scaffolded (after the user skips the wizard). Tells them
 * what is missing in friendly terms and reopens the wizard to finish.
 */
export function ScaffoldNotice({ status, onComplete }: ScaffoldNoticeProps) {
  if (status === 'ready') return null
  const copy = COPY[status]
  return (
    <Alert color={copy.color} icon={<IconAlertTriangle size={18} />} title={copy.title} mb="lg">
      <Text size="sm" mb="sm">
        {copy.message}
      </Text>
      <Button
        size="xs"
        variant="filled"
        className={styles.noticeAction}
        leftSection={<IconSettings size={14} />}
        onClick={onComplete}
      >
        {copy.action}
      </Button>
    </Alert>
  )
}
